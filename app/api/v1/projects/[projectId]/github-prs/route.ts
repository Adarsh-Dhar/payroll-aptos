import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const querySchema = z.object({
  githubToken: z.string().min(1, 'GitHub token is required'),
  state: z.enum(['open', 'closed', 'all']).optional().default('all'),
  per_page: z.coerce.number().min(1).max(100).optional().default(30),
  page: z.coerce.number().min(1).optional().default(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId);
    const { searchParams } = new URL(request.url);
    const { githubToken, state, per_page, page } = querySchema.parse(Object.fromEntries(searchParams));

    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get project details to extract repository information
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const project = await prisma.project.findUnique({
      where: { id: projectIdNum },
      select: { repoUrl: true, name: true }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.repoUrl) {
      return NextResponse.json(
        { success: false, message: 'Project repository URL not found' },
        { status: 400 }
      );
    }

    // Parse repository URL to extract owner and repo name
    const repoUrlMatch = project.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoUrlMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    const [, owner, repo] = repoUrlMatch;
    
    // Build GitHub API URL for PRs
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=${per_page}&page=${page}&sort=updated&direction=desc`;
    
    console.log('Fetching PRs from GitHub:', {
      owner,
      repo,
      state,
      per_page,
      page,
      apiUrl: githubApiUrl
    });

    // Fetch PRs from GitHub API
    const githubResponse = await fetch(githubApiUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'DevPayStream-Bot'
      }
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('GitHub API error:', {
        status: githubResponse.status,
        statusText: githubResponse.statusText,
        error: errorText
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to fetch PRs from GitHub',
          githubError: errorText,
          status: githubResponse.status
        },
        { status: githubResponse.status }
      );
    }

    const githubData = await githubResponse.json();
    
    // Get total count from GitHub API headers
    const linkHeader = githubResponse.headers.get('link');
    let totalCount = githubData.length;
    let hasNextPage = false;
    let hasPrevPage = false;
    
    if (linkHeader) {
      const links = linkHeader.split(',').map(link => {
        const [url, rel] = link.split(';').map(s => s.trim());
        const relMatch = rel.match(/rel="([^"]+)"/);
        return {
          url: url.replace(/[<>]/g, ''),
          rel: relMatch ? relMatch[1] : ''
        };
      });
      
      hasNextPage = links.some(link => link.rel === 'next');
      hasPrevPage = links.some(link => link.rel === 'prev');
      
      // Try to get total count from the last page
      if (hasNextPage) {
        const lastPageLink = links.find(link => link.rel === 'last');
        if (lastPageLink) {
          try {
            const lastPageResponse = await fetch(lastPageLink.url, {
              headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${githubToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'DevPayStream-Bot'
              }
            });
            if (lastPageResponse.ok) {
              const lastPageData = await lastPageResponse.json();
              totalCount = (page - 1) * per_page + lastPageData.length;
            }
          } catch (error) {
            console.warn('Failed to get total count from last page:', error);
          }
        }
      }
    }

    // Transform GitHub PR data to match our expected format
    const transformedPRs = githubData.map((pr: any) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      description: pr.body,
      state: pr.state,
      merged: pr.merged,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
      author: pr.user?.login,
      headBranch: pr.head?.ref,
      baseBranch: pr.base?.ref,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      url: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      draft: pr.draft,
      labels: pr.labels?.map((label: any) => label.name) || [],
      assignees: pr.assignees?.map((assignee: any) => assignee.login) || [],
      requestedReviewers: pr.requested_reviewers?.map((reviewer: any) => reviewer.login) || [],
      commits: pr.commits,
      comments: pr.comments,
      reviewComments: pr.review_comments,
      repository: {
        fullName: pr.base?.repo?.full_name,
        name: pr.base?.repo?.name,
        owner: pr.base?.repo?.owner?.login,
        url: pr.base?.repo?.html_url
      }
    }));

    console.log(`Successfully fetched ${transformedPRs.length} PRs from GitHub`);

    return NextResponse.json({
      success: true,
      data: transformedPRs,
      pagination: {
        page,
        per_page,
        total: totalCount,
        hasNextPage,
        hasPrevPage,
        totalPages: Math.ceil(totalCount / per_page)
      },
      repository: {
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
        url: project.repoUrl
      }
    });

  } catch (error) {
    console.error('Error fetching GitHub PRs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid query parameters',
          errors: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
