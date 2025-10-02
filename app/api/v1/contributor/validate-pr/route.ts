import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    console.log('=== PR VALIDATION API REQUEST ===');
    
    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Get GitHub username from session
    const sessionUser = session.user as { githubUsername?: string };
    const githubUsername = sessionUser.githubUsername;
    
    if (!githubUsername) {
      return NextResponse.json(
        { error: 'GitHub username not found in session. Please authenticate with GitHub.' },
        { status: 400 }
      );
    }

    console.log('Authenticated user GitHub username:', githubUsername);

    const body = await req.json();
    console.log('Request body:', body);
    
    const { prUrl, githubToken, projectRepoUrl } = body;

    if (!prUrl || !githubToken || !projectRepoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: prUrl, githubToken, and projectRepoUrl are required' },
        { status: 400 }
      );
    }

    // Parse PR URL to get owner, repo, and PR number
    const prUrlMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!prUrlMatch) {
      return NextResponse.json(
        { error: 'Invalid PR URL format. Expected: https://github.com/owner/repo/pull/123' },
        { status: 400 }
      );
    }

    const [, prOwner, prRepo, prNumber] = prUrlMatch;
    
    // Parse project repo URL to get owner and repo
    const projectRepoMatch = projectRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!projectRepoMatch) {
      return NextResponse.json(
        { error: 'Invalid project repository URL format' },
        { status: 400 }
      );
    }

    const [, projectOwner, projectRepo] = projectRepoMatch;

    console.log('Parsed URLs:', {
      prOwner,
      prRepo,
      prNumber,
      projectOwner,
      projectRepo
    });

    // STEP 1: Verify PR belongs to the project repository
    if (prOwner !== projectOwner || prRepo !== projectRepo) {
      return NextResponse.json(
        { 
          error: 'PR does not belong to the project repository',
          details: {
            prRepository: `${prOwner}/${prRepo}`,
            projectRepository: `${projectOwner}/${projectRepo}`
          }
        },
        { status: 400 }
      );
    }

    console.log('✅ STEP 1 PASSED: PR belongs to project repository');

    // Fetch PR details from GitHub API
    const prApiUrl = `https://api.github.com/repos/${prOwner}/${prRepo}/pulls/${prNumber}`;
    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'DevPayStream-PR-Validator',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    console.log('Fetching PR details from GitHub API...');
    const prResponse = await fetch(prApiUrl, { headers });
    
    if (!prResponse.ok) {
      const errorData = await prResponse.json().catch(() => ({}));
      console.error('GitHub API error:', prResponse.status, errorData);
      return NextResponse.json(
        { 
          error: `Failed to fetch PR details: ${prResponse.status} ${prResponse.statusText}`,
          details: errorData
        },
        { status: prResponse.status }
      );
    }

    const prData = await prResponse.json();
    console.log('PR data fetched:', {
      id: prData.id,
      number: prData.number,
      title: prData.title,
      author: prData.user?.login,
      state: prData.state,
      merged: prData.merged
    });

    // STEP 2: Verify PR belongs to the signed GitHub account
    const prAuthor = prData.user?.login;
    if (!prAuthor) {
      return NextResponse.json(
        { error: 'Could not determine PR author from GitHub API response' },
        { status: 400 }
      );
    }

    if (prAuthor !== githubUsername) {
      return NextResponse.json(
        { 
          error: 'PR does not belong to the authenticated GitHub account',
          details: {
            prAuthor: prAuthor,
            authenticatedUser: githubUsername,
            message: 'Only the PR author can claim the bounty for this pull request'
          }
        },
        { status: 403 }
      );
    }

    console.log('✅ STEP 2 PASSED: PR belongs to authenticated GitHub account');

    // STEP 3: Verify PR is merged
    if (!prData.merged) {
      return NextResponse.json(
        { 
          error: 'PR must be merged before claiming bounty',
          details: {
            prState: prData.state,
            merged: prData.merged,
            message: 'Only merged pull requests are eligible for bounty claims'
          }
        },
        { status: 400 }
      );
    }

    console.log('✅ STEP 3 PASSED: PR is merged');

    // All verifications passed - call the PR scoring API
    console.log('All verifications passed! Calling PR scoring API...');
    const scoringResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/agents/github/contribution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prUrl,
        githubToken
      })
    });

    if (!scoringResponse.ok) {
      const scoringError = await scoringResponse.json().catch(() => ({}));
      console.error('PR scoring API error:', scoringResponse.status, scoringError);
      return NextResponse.json(
        { 
          error: `Failed to analyze PR: ${scoringResponse.status} ${scoringResponse.statusText}`,
          details: scoringError
        },
        { status: scoringResponse.status }
      );
    }

    const scoringResult = await scoringResponse.json();
    console.log('PR scoring result:', scoringResult);

    // Check if this is spam (0 score)
    if (scoringResult.analysis && scoringResult.analysis.final_score === 0) {
      return NextResponse.json(
        { 
          error: 'This PR is classified as spam and cannot be claimed',
          details: {
            reason: 'Empty or worthless PR with no meaningful changes',
            score: 0,
            message: 'Spam PRs are not eligible for bounty claims'
          }
        },
        { status: 400 }
      );
    }

    // Normalize analysis if using LLM schema
    let normalizedAnalysis = scoringResult.analysis;
    if (normalizedAnalysis && normalizedAnalysis.metric_scores && normalizedAnalysis.metric_scores.execution) {
      const a = normalizedAnalysis;
      const llmCategoryMap: Record<string, 'easy' | 'medium' | 'hard'> = {
        'low-impact': 'easy',
        'medium-impact': 'medium',
        'high-impact': 'hard',
      };
      normalizedAnalysis = {
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
        honest_review: a.honest_review || null,
      };
    }

    // Return successful validation result with PR score
    return NextResponse.json({
      success: true,
      message: 'PR validation successful - all verification steps passed',
      validation: {
        step1_prBelongsToProject: true,
        step2_prBelongsToAuthenticatedUser: true,
        step3_prIsMerged: true,
        prAuthor: prAuthor,
        prNumber: prNumber,
        prTitle: prData.title,
        prUrl: prUrl,
        projectRepository: `${projectOwner}/${projectRepo}`
      },
      analysis: normalizedAnalysis,
      metadata: {
        validated_at: new Date().toISOString(),
        project_repository: `${projectOwner}/${projectRepo}`,
        pr_repository: `${prOwner}/${prRepo}`,
        authenticated_user: githubUsername
      }
    });

  } catch (error) {
    console.error('PR Validation Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate PR', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
