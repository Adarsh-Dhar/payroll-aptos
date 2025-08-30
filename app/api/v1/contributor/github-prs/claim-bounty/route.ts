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
    
    const { prNumber, repository, additions, deletions, hasTests, description, commits } = body;
    
    console.log('Parsed claim request data:', {
      prNumber,
      repository,
      additions,
      deletions,
      hasTests,
      description,
      commits
    });

    if (!prNumber || !repository) {
      console.error('Missing required fields:', { prNumber, repository });
      return NextResponse.json(
        { success: false, message: 'Missing required fields: prNumber and repository' },
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
    let lowestBounty = 100; // Default values
    let highestBounty = 1000;
    
    try {
      // Look for project by repoUrl or name
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
      
      if (project) {
        console.log('✅ Project found in database:', project);
        lowestBounty = project.lowestBounty || 100;
        highestBounty = project.highestBounty || 1000;
      } else {
        console.log('⚠️ Project not found in database, using default bounty values');
        console.log('Searched for:', { repository, repoOwner, repoName });
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
            prUrl: githubUrl || `https://github.com/${repository}/pull/${prNumber}`,
            repoUrl: `https://github.com/${repository}`,
            owner: repoOwner,
            repo: repoName,
            prNumber: prNumber,
            githubToken: process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || 'mock-token'
          })
        }
      );
      
      if (contributionResponse.ok) {
        const contributionData = await contributionResponse.json();
        if (contributionData.success && contributionData.analysis) {
          contributionScore = contributionData.analysis.final_score || 0;
          console.log('✅ Contribution score from GitHub API:', contributionScore);
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
    
    // Fallback contribution score calculation if API fails
    if (contributionScore === 0) {
      console.log('=== FALLBACK CONTRIBUTION SCORE CALCULATION ===');
      let score = 0;
      score += 10; // Base score
      if (hasTests) score += 20;
      if (description && description.length > 100) score += 15;
      const totalChanges = (additions || 0) + (deletions || 0);
      if (totalChanges > 0) {
        score += Math.min(20, totalChanges * 0.1);
      }
      if (commits && commits.length > 0) {
        score += Math.min(15, commits.length * 0.5);
      }
      contributionScore = Math.min(100, score);
      console.log('Fallback contribution score:', contributionScore);
    }
    
    // Calculate bounty using the formula: L + (D * x / 10)
    // where L = lowest bounty, D = difference between highest and lowest, x = score
    const difference = highestBounty - lowestBounty;
    const bountyAmount = lowestBounty + (difference * contributionScore / 10);
    
    console.log('=== BOUNTY CALCULATION ===');
    console.log(`PR Number: ${prNumber}`);
    console.log(`Repository: ${repository}`);
    console.log(`Project found: ${project ? 'Yes' : 'No'}`);
    console.log(`Database bounty range: $${lowestBounty} - $${highestBounty}`);
    console.log(`Contribution Score: ${contributionScore}`);
    console.log(`Bounty Formula: L + (D × x / 10) = ${lowestBounty} + (${difference} × ${contributionScore} / 10)`);
    console.log(`Calculated Bounty: $${bountyAmount}`);
    
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

    return NextResponse.json({
      success: true,
      message: 'Bounty claimed successfully',
      data: {
        prNumber,
        repository,
        bountyAmount: bountyAmount,
        contributionScore,
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
          formula: `L + (D × x / 10) = ${lowestBounty} + (${difference} × ${contributionScore} / 10) = ${bountyAmount}`
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
