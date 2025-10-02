import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session found' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { prNumber, repository, additions, deletions, hasTests, description, bountyAmount: providedBountyAmount, projectId, githubToken } = body;

    if (!prNumber || !repository) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: prNumber and repository' },
        { status: 400 }
      );
    }

    const effectiveGithubToken = githubToken || process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!effectiveGithubToken) {
      return NextResponse.json(
        { success: false, message: 'GitHub token is required for PR analysis' },
        { status: 400 }
      );
    }
    
    if (typeof prNumber !== 'number' || typeof repository !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid data types: prNumber must be number, repository must be string' },
        { status: 400 }
      );
    }
    
    const [repoOwner, repoName] = repository.split('/');
    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { success: false, message: 'Invalid repository format. Expected format: owner/repo' },
        { status: 400 }
      );
    }
    
    const { prisma } = await import('@/lib/prisma');
    let project = null;
    let lowestBounty = 0.01;
    let highestBounty = 0.10;
    
    try {
      if (projectId) {
        project = await prisma.project.findUnique({
          where: { id: parseInt(projectId) },
          select: {
            id: true,
            name: true,
            repoUrl: true,
            lowestBounty: true,
            highestBounty: true,
          }
        });
      }
      
      if (!project) {
        project = await prisma.project.findFirst({
          where: {
            OR: [
              { repoUrl: { contains: repository } },
              { name: { contains: repository } },
              { name: { contains: repoName } }
            ]
          },
          select: {
            id: true,
            name: true,
            repoUrl: true,
            lowestBounty: true,
            highestBounty: true,
          }
        });
      }
      
      if (project) {
        lowestBounty = project.lowestBounty || 0.01;
        highestBounty = project.highestBounty || 0.10;
        
        if (highestBounty - lowestBounty < 0.01) {
          lowestBounty = 0.01;
          highestBounty = 0.10;
        }
      }
    } catch (error) {
      console.error('Database error:', error);
    }
    
    let contributionScore = 0;
    let detailedAnalysis = null;
    let metricScores = null;
    let category = 'medium';
    let reasoning = '';
    let keyInsights = null;
    
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    try {
      const contributionResponse = await fetch(
        `${baseUrl}/api/agents/github/contribution`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prUrl: `https://github.com/${repository}/pull/${prNumber}`,
            repoUrl: `https://github.com/${repository}`,
            owner: repoOwner,
            repo: repoName,
            prNumber: prNumber,
            githubToken: effectiveGithubToken
          })
        }
      );
      
      if (contributionResponse.ok) {
        const contributionData = await contributionResponse.json();
        if (contributionData.success && contributionData.analysis) {
          const a = contributionData.analysis;
          const isLLMSchema = a && a.metric_scores && a.metric_scores.execution && typeof a.final_score === 'number';
          const llmCategoryMap: Record<string, 'easy' | 'medium' | 'hard'> = {
            'low-impact': 'easy',
            'medium-impact': 'medium',
            'high-impact': 'hard',
          };

          const normalized = isLLMSchema ? {
            category: llmCategoryMap[(a.category || '').toLowerCase()] || 'medium',
            final_score: a.final_score,
            metric_scores: {
              code_size: a.metric_scores.execution.code_size,
              review_cycles: a.metric_scores.execution.review_cycles,
              review_time: a.metric_scores.execution.review_time,
              first_review_wait: a.metric_scores.execution.first_review_wait,
              review_depth: a.metric_scores.execution.review_depth,
              code_quality: a.metric_scores.execution.code_quality,
            },
            reasoning: a.reasoning || '',
            key_insights: a.key_insights || null,
          } : a;

          detailedAnalysis = normalized;
          contributionScore = normalized.final_score || 0;
          metricScores = normalized.metric_scores;
          category = normalized.category || 'medium';
          reasoning = normalized.reasoning || '';
          keyInsights = normalized.key_insights;
        }
      }
    } catch (error) {
      console.error('GitHub contribution API error:', error);
    }
    
    if (contributionScore === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'This PR is classified as spam and cannot be claimed',
          details: {
            reason: 'Empty or worthless PR with no meaningful changes',
            score: 0,
            message: 'Spam PRs are not eligible for bounty claims'
          }
        },
        { status: 400 }
      );
    }
    
    const difference = highestBounty - lowestBounty;
    
    let bountyAmount;
    if (providedBountyAmount && typeof providedBountyAmount === 'number' && providedBountyAmount > 0) {
      bountyAmount = providedBountyAmount;
    } else {
      bountyAmount = lowestBounty + (difference * contributionScore / 10);
      bountyAmount = Math.round(bountyAmount * 100_000_000) / 100_000_000;
      
      if (bountyAmount < lowestBounty) {
        bountyAmount = lowestBounty;
      }
    }

    const totalChanges = (additions || 0) + (deletions || 0);
    
    const projectHasBounty = project || 
      repository.includes('devpaystream') || 
      repository.includes('devpay') || 
      repository.includes('Adarsh-Dhar/Project-S') || 
      repository.includes('Project-S') ||
      totalChanges > 0 || 
      hasTests || 
      (description && description.length > 50) ||
      repository.includes('Project') || 
      repository.includes('project');
    
    if (!projectHasBounty) {
      return NextResponse.json(
        { 
          success: false, 
          message: `No bounty setup for repository ${repository}. This repository is not configured for bounty payments.`,
          repository,
          totalChanges,
          hasTests,
          descriptionLength: description?.length || 0
        },
        { status: 400 }
      );
    }


    return NextResponse.json({
      success: true,
      message: 'Bounty claimed successfully',
      data: {
        prNumber,
        repository,
        bountyAmount: bountyAmount,
        contributionScore,
        category,
        project: project ? {
          id: project.id,
          name: project.name,
          repoUrl: project.repoUrl
        } : null,
        bountyCalculation: {
          lowestBounty,
          highestBounty,
          difference,
          contributionScore,
          calculatedBounty: bountyAmount,
          formula: `L + (D × score / 10) = ${lowestBounty} + (${difference} × ${contributionScore} / 10) = ${bountyAmount}`,
          stepByStep: `${lowestBounty} + (${difference} × ${contributionScore} / 10) = ${lowestBounty} + (${(difference * contributionScore / 10).toFixed(8)}) = ${bountyAmount}`
        },
        prAnalysis: {
          finalScore: contributionScore,
          category,
          metricScores,
          reasoning,
          keyInsights,
          usedApi: !!detailedAnalysis,
          metadata: detailedAnalysis ? {
            analyzedAt: new Date().toISOString(),
            hasLinkedIssue: false, // Could be enhanced to check for linked issues
            usedLlm: false // Could be enhanced to track LLM usage
          } : null
        }
      }
    });

  } catch (error) {
    console.error('Bounty claim error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add GET method for testing
export async function GET() {
  return NextResponse.json({
    message: 'GitHub PR Bounty Claim API is running',
    timestamp: new Date().toISOString()
  });
}
