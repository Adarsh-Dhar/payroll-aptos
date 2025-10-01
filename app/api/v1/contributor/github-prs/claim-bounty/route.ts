import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    console.log('=== GITHUB PR BOUNTY CLAIM REQUEST ===');
    
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    console.log('Session found:', !!session);
    console.log('Session user:', session?.user);
    
    if (!session?.user?.email) {
      console.log('No session or user email found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session found' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log('Raw request body:', body);
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { prNumber, repository, additions, deletions, hasTests, description, commits, bountyAmount: providedBountyAmount, projectId, githubToken } = body;
    
    console.log('Parsed claim request data:', {
      prNumber,
      repository,
      additions,
      deletions,
      hasTests,
      description,
      commits,
      providedBountyAmount,
      projectId
    });

    if (!prNumber || !repository) {
      console.error('Missing required fields:', { prNumber, repository });
      return NextResponse.json(
        { success: false, message: 'Missing required fields: prNumber and repository' },
        { status: 400 }
      );
    }

    // Validate GitHub token
    const effectiveGithubToken = githubToken || process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!effectiveGithubToken) {
      console.error('Missing GitHub token');
      return NextResponse.json(
        { success: false, message: 'GitHub token is required for PR analysis' },
        { status: 400 }
      );
    }
    
    // Validate data types
    if (typeof prNumber !== 'number' || typeof repository !== 'string') {
      console.error('Invalid data types:', { 
        prNumber: typeof prNumber, 
        repository: typeof repository 
      });
      return NextResponse.json(
        { success: false, message: 'Invalid data types: prNumber must be number, repository must be string' },
        { status: 400 }
      );
    }

    // First, check if this repository exists in our database
    console.log('=== CHECKING DATABASE FOR PROJECT ===');
    
    // Extract owner and repo from repository string (e.g., "Adarsh-Dhar/Project-S")
    const [repoOwner, repoName] = repository.split('/');
    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { success: false, message: 'Invalid repository format. Expected format: owner/repo' },
        { status: 400 }
      );
    }
    
    // Check if we have a project in the database with this repository
    const prisma = new PrismaClient();
    let project = null;
    let lowestBounty = 0.01; // Default values - using cents for small projects
    let highestBounty = 0.10;
    
    try {
      // Look for project by ID first (if provided), then by repoUrl or name
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
        console.log('Looking up project by ID:', projectId);
      }
      
      // If not found by ID, try by repository
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
        console.log('Looking up project by repository:', repository);
      }
      
      if (project) {
        console.log('✅ Project found in database:', project);
        lowestBounty = project.lowestBounty || 0.01;
        highestBounty = project.highestBounty || 0.10;
        
        console.log('📊 Project bounty configuration:');
        console.log(`   - Lowest Bounty: $${project.lowestBounty}`);
        console.log(`   - Highest Bounty: $${project.highestBounty}`);
        console.log(`   - Difference: $${(project.highestBounty || 0.10) - (project.lowestBounty || 0.01)}`);
        
        // Check if bounty ranges are too small and adjust if needed
        if (highestBounty - lowestBounty < 0.01) {
          console.log('⚠️ Project bounty range is too small, adjusting to reasonable defaults');
          console.log('Original range:', { lowestBounty: project.lowestBounty, highestBounty: project.highestBounty });
          lowestBounty = 0.01;
          highestBounty = 0.10;
        }
      } else {
        console.log('⚠️ Project not found in database, using default bounty values');
        console.log('Searched for:', { repository, repoOwner, repoName });
        console.log('This might be why the bounty calculation is wrong!');
      }
    } catch (error) {
      console.error('Database error:', error);
      console.log('⚠️ Using default bounty values due to database error');
    } finally {
      await prisma.$disconnect();
    }
    
    // Get contribution score from the GitHub contribution API
    console.log('=== GETTING CONTRIBUTION SCORE FROM GITHUB API ===');
    let contributionScore = 0;
    let detailedAnalysis = null;
    let metricScores = null;
    let category = 'medium';
    let reasoning = '';
    let keyInsights = null;
    
    // Check if GitHub contribution API is available
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    try {
      // Call the GitHub contribution API to get the score
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
          // Normalize possible LLM schema to flat structure
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
          
          console.log('✅ Contribution score from GitHub API:', contributionScore);
          console.log('📊 Category:', category);
          console.log('📈 Metric scores:', metricScores);
          console.log('💭 Reasoning:', reasoning);
        } else {
          console.log('⚠️ GitHub API response not successful, using fallback score');
        }
      } else {
        console.log('⚠️ GitHub contribution API failed, using fallback score');
        console.log('Response status:', contributionResponse.status);
      }
    } catch (error) {
      console.error('GitHub contribution API error:', error);
      console.log('⚠️ Using fallback contribution score');
    }
    
    // Require successful API response
    if (contributionScore === 0) {
      console.error('GitHub contribution API failed and no fallback available');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to analyze PR contribution. Please ensure the GitHub contribution API is working properly.' 
        },
        { status: 500 }
      );
    }
    
    // Calculate difference for logging purposes
    const difference = highestBounty - lowestBounty;
    
    // Use provided bounty amount if available, otherwise calculate it
    let bountyAmount;
    if (providedBountyAmount && typeof providedBountyAmount === 'number' && providedBountyAmount > 0) {
      bountyAmount = providedBountyAmount;
      console.log('=== USING PROVIDED BOUNTY AMOUNT ===');
      console.log(`Provided bounty amount: $${bountyAmount}`);
      console.log(`Project bounty range: $${lowestBounty} - $${highestBounty}`);
      console.log(`Difference: $${difference}`);
    } else {
      // Calculate bounty using the formula: L + (D * score / 10)
      // where L = lowest bounty, D = difference between highest and lowest, score = 0-10 scale
      // The score is already on a 0-10 scale, so we divide by 10 to get the multiplier
      bountyAmount = lowestBounty + (difference * contributionScore / 10);
      
      // Round to 8 decimal places to avoid floating-point precision issues
      bountyAmount = Math.round(bountyAmount * 100_000_000) / 100_000_000;
      console.log('=== BOUNTY CALCULATION ===');
      console.log(`PR Number: ${prNumber}`);
      console.log(`Repository: ${repository}`);
      console.log(`Project found: ${project ? 'Yes' : 'No'}`);
      console.log(`Database bounty range: $${lowestBounty} - $${highestBounty}`);
      console.log(`Contribution Score: ${contributionScore}/10`);
      console.log(`Difference (D): $${difference}`);
      console.log(`Bounty Formula: L + (D × score / 10) = ${lowestBounty} + (${difference} × ${contributionScore} / 10)`);
      console.log(`Step by step: ${lowestBounty} + (${difference} × ${contributionScore} / 10) = ${lowestBounty} + (${(difference * contributionScore / 10).toFixed(8)}) = ${bountyAmount}`);
      console.log(`Calculated Bounty: $${bountyAmount} (rounded to 8 decimal places)`);
      console.log(`Verification: If score is ${contributionScore}/10, multiplier is ${(contributionScore / 10).toFixed(8)}`);
      console.log(`Verification: Difference × multiplier = ${difference} × ${(contributionScore / 10).toFixed(8)} = ${(difference * contributionScore / 10).toFixed(8)}`);
      
      // Ensure minimum bounty amount (but allow exceeding maximum)
      if (bountyAmount < lowestBounty) {
        console.log(`⚠️ Calculated bounty ($${bountyAmount}) is less than minimum ($${lowestBounty}), using minimum`);
        bountyAmount = lowestBounty;
      }
      // Note: We allow the bounty to exceed the maximum if the calculation results in a higher value
      // The maximum is a guideline, not a hard cap
      if (bountyAmount > highestBounty) {
        console.log(`ℹ️ Calculated bounty ($${bountyAmount}) exceeds maximum guideline ($${highestBounty}), using calculated value`);
      }
    }
    
    // Additional PR details for debugging
    console.log(`Additions: ${additions}`);
    console.log(`Deletions: ${deletions}`);
    console.log(`Has Tests: ${hasTests}`);
    console.log(`Description Length: ${description?.length || 0}`);
    console.log(`Commits: ${commits?.length || 0}`);

    // Check if this repository has bounty setup
    let projectHasBounty = false;
    const totalChanges = (additions || 0) + (deletions || 0);
    
    // Repository has bounty if:
    // 1. Project exists in database, OR
    // 2. Repository is whitelisted, OR
    // 3. Repository has meaningful contribution
    
    if (project) {
      projectHasBounty = true;
      console.log(`✅ Repository ${repository} has bounty enabled (found in database)`);
    } else if (repository.includes('devpaystream') || repository.includes('devpay') || 
               repository.includes('Adarsh-Dhar/Project-S') || repository.includes('Project-S')) {
      projectHasBounty = true;
      console.log(`✅ Repository ${repository} has bounty enabled (whitelisted)`);
    } else if (totalChanges > 0 || hasTests || (description && description.length > 50)) {
      projectHasBounty = true;
      console.log(`✅ Repository ${repository} has bounty for meaningful contribution (changes: ${totalChanges}, tests: ${hasTests}, desc: ${description?.length || 0} chars)`);
    } else if (repository.includes('Project') || repository.includes('project')) {
      projectHasBounty = true;
      console.log(`✅ Repository ${repository} has bounty enabled (project repository)`);
    } else {
      console.log(`❌ Repository ${repository} does not have bounty setup`);
      console.log(`Repository details: changes=${totalChanges}, tests=${hasTests}, desc_length=${description?.length || 0}`);
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

    console.log('=== BOUNTY CLAIM SUCCESS ===');
    console.log(`✅ Bounty claimed successfully for PR #${prNumber}`);
    console.log(`💰 Amount: $${bountyAmount}`);
    console.log(`📁 Repository: ${repository}`);
    console.log(`👤 User: ${session.user.email}`);
    console.log(`🔍 Final bounty amount being returned: $${bountyAmount}`);
    console.log(`🔍 Project used: ${project ? `ID ${project.id} (${project.name})` : 'None'}`);
    console.log(`📊 PR Analysis Summary:`);
    console.log(`   - Final Score: ${contributionScore}/10`);
    console.log(`   - Category: ${category}`);
    console.log(`   - Used API: ${!!detailedAnalysis ? 'Yes' : 'No (Fallback)'}`);
    if (metricScores) {
      console.log(`   - Code Size: ${metricScores.code_size}/10`);
      console.log(`   - Review Cycles: ${metricScores.review_cycles}/10`);
      console.log(`   - Review Time: ${metricScores.review_time}/10`);
      console.log(`   - First Review Wait: ${metricScores.first_review_wait}/10`);
      console.log(`   - Review Depth: ${metricScores.review_depth}/10`);
      console.log(`   - Code Quality: ${metricScores.code_quality}/10`);
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
    console.error('=== GITHUB PR BOUNTY CLAIM ERROR ===');
    console.error('Error details:', error);
    
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
