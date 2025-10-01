import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    
    // Get the authenticated session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session found' },
        { status: 401 }
      )
    }
    

    // Get the access token from the session
    const accessToken = (session as any).accessToken
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'No GitHub access token found' },
        { status: 401 }
      )
    }

    // Get the GitHub username from the session or query params
    const { searchParams } = new URL(request.url)
    let username = searchParams.get('username')
    
    if (!username) {
      return NextResponse.json(
        { success: false, message: 'GitHub username is required' },
        { status: 400 }
      )
    }

    // Extract the actual GitHub username from the session user data
    // The session might have "Adarsh Dhar" but we need "Adarsh-Dhar"
    const sessionUser = session.user as any
    let githubUsername = username
    
    // If the session has a GitHub-related field, use that instead
    if (sessionUser.githubUsername) {
      githubUsername = sessionUser.githubUsername
    } else if (sessionUser.login) {
      githubUsername = sessionUser.login
    } else if (sessionUser.name) {
      // Try to convert "Adarsh Dhar" to "Adarsh-Dhar" format
      // This is a fallback - ideally we should get the actual GitHub username
      githubUsername = sessionUser.name.replace(/\s+/g, '-')
    }
    
    // Manual override for testing - remove this in production
    if (githubUsername === 'Adarsh Dhar') {
      githubUsername = 'Adarsh-Dhar'
    }
    


    // Fetch PRs from GitHub API
    const githubUrl = `https://api.github.com/search/issues?q=type:pr+author:${githubUsername}&per_page=100&sort=created&order=desc`
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })


    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      console.error('GitHub API error response:', errorText)
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to fetch from GitHub API',
          githubError: errorText,
          status: githubResponse.status
        },
        { status: 500 }
      )
    }

    const githubData = await githubResponse.json()
    
    if (githubData.items && githubData.items.length > 0) {
    }

    // List of repositories that have bounty enabled
    const bountyEnabledRepos = [
      'devpaystream',
      'devpay',
      'Adarsh-Dhar/Project-S', // Your specific repository
      'Project-S' // Also check for just the project name
    ];
    
    // Check database for existing claimed PRs to merge with GitHub data
    let existingPRs: any[] = [];
    try {
      const prisma = new PrismaClient();
      existingPRs = await prisma.pullRequest.findMany({
        where: {
          OR: githubData.items.map((item: any) => {
            const repoUrlParts = item.repository_url.split('/');
            const repoOwner = repoUrlParts[repoUrlParts.length - 2];
            const repoName = repoUrlParts[repoUrlParts.length - 1];
            const repoFullName = `${repoOwner}/${repoName}`;
            return {
              AND: [
                { prNumber: item.number },
                {
                  OR: [
                    { linkedIssue: { contains: repoFullName } },
                    { title: { contains: repoFullName } },
                    { Project: { name: { contains: repoFullName } } }
                  ]
                }
              ]
            };
          })
        },
        select: {
          prNumber: true,
          bountyClaimed: true,
          bountyClaimedAt: true,
          amountPaid: true,
          Project: {
            select: {
              id: true,
              name: true,
              repoUrl: true,
              lowestBounty: true,
              highestBounty: true,
            }
          }
        }
      });
      await prisma.$disconnect();
    } catch (error) {
    }

    // Transform GitHub data to match our expected format
    const transformedPRs = githubData.items.map((item: any, index: number) => {
      // Extract repository information from the repository_url
      const repoUrlParts = item.repository_url.split('/')
      const repoOwner = repoUrlParts[repoUrlParts.length - 2]
      const repoName = repoUrlParts[repoUrlParts.length - 1]
      const repoFullName = `${repoOwner}/${repoName}`
      
      // Check if project has bounty settings from database
      let bountyAmount = 0
      let projectHasBounty = false
      
      if (item.repository_url) {
        // Check if this repository is registered in any project
        const projectName = repoFullName
        
        // Only projects in database have bounty enabled
        if (existingPRs.length > 0) {
          const existingPR = existingPRs.find(epr => epr.prNumber === item.number);
          if (existingPR && existingPR.Project) {
            projectHasBounty = true
            // Bounty amount will be calculated by the contribution API
            bountyAmount = 0 // Will be calculated later
          }
        }
      }
      
      const transformed = {
        id: `github-${item.id}-${index}`, // Use GitHub PR ID + index for unique ID
        prNumber: item.number,
        title: item.title,
        description: item.body || '',
        additions: 0, // GitHub API doesn't provide this in search results
        deletions: 0, // GitHub API doesn't provide this in search results
        hasTests: false, // Would need additional API calls to determine this
        linkedIssue: item.html_url,
        merged: item.state === 'closed',
        score: 0, // Would need additional logic to calculate
        amountPaid: 0, // Not applicable for GitHub data
        bountyAmount: bountyAmount, // Will be calculated based on project bounty settings
        bountyClaimed: false, // Will be checked from database
        bountyClaimedAt: null, // Will be checked from database
        bountyClaimedBy: null, // Will be checked from database
        bountyClaimedAmount: null, // Will be checked from database
        developerId: 1, // Default value
        projectId: 1, // Default value
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        repository: repoFullName, // Add repository field with owner/repo format
        Project: {
          id: 1,
          name: repoFullName,
          repoUrl: `https://github.com/${repoFullName}`,
          lowestBounty: 0, // Will be set based on project settings
          highestBounty: 0 // Will be set based on project settings
        },
        Developer: {
          id: 1,
          username: githubUsername,
          githubId: githubUsername
        },
        commits: [] // Add commits field for bounty calculation
      }
      
      // Bounty amount will be calculated by the contribution API when claiming
      if (projectHasBounty) {
      } else {
      }
      
      
      // Check if this PR exists in our database and merge the claimed status
      const existingPR = existingPRs.find(epr => epr.prNumber === item.number);
      if (existingPR) {
        transformed.bountyClaimed = existingPR.bountyClaimed;
        transformed.bountyClaimedAt = existingPR.bountyClaimedAt;
        transformed.bountyClaimedBy = null; // Will be set when claimed
        transformed.bountyClaimedAmount = existingPR.amountPaid || null; // Use amountPaid as claimed amount
        transformed.amountPaid = existingPR.amountPaid;
        
        // Use project info from database if available
        if (existingPR.Project) {
          transformed.Project = {
            id: existingPR.Project.id,
            name: existingPR.Project.name,
            repoUrl: existingPR.Project.repoUrl,
            lowestBounty: existingPR.Project.lowestBounty || 100,
            highestBounty: existingPR.Project.highestBounty || 1000
          };
        }
        
        // IMPORTANT: Never overwrite the repository field with database values
        // Keep the original GitHub repository information for API calls
        
      }
      
      // Log the project ID and PR number that will be used for bounty claims
      
      // Log available data for bounty calculation
      
      return transformed
    })

    // Calculate stats
    const stats = {
      totalPRs: githubData.total_count,
      mergedPRs: transformedPRs.filter((pr: any) => pr.merged).length,
      openPRs: transformedPRs.filter((pr: any) => !pr.merged).length,
      totalEarnings: 0, // Not applicable for GitHub data
      averageScore: 0 // Not applicable for GitHub data
    }

    const response = {
      success: true,
      data: transformedPRs,
      stats,
      pagination: {
        page: 1,
        limit: 100,
        total: githubData.total_count,
        totalPages: Math.ceil(githubData.total_count / 100)
      }
    }

    
    // Log summary of all repositories found
    
    // Log unique IDs to check for duplicates
    if (false) {
      console.warn('⚠️ Duplicate IDs detected!')
      const duplicates = ids.filter((id: any, index: number) => ids.indexOf(id) !== index)
      console.warn('Duplicate IDs:', duplicates)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('GitHub PRs fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
