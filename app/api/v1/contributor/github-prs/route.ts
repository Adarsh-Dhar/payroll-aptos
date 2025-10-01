import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    console.log('GitHub PRs API called')
    
    // Get the authenticated session
    const session = await getServerSession(authOptions)
    console.log('Session found:', !!session)
    console.log('Session user:', session?.user)
    
    if (!session?.user?.email) {
      console.log('No session or user email found')
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session found' },
        { status: 401 }
      )
    }
    

    // Get the access token from the session
    const accessToken = (session as any).accessToken
    console.log('Access token present:', !!accessToken)
    
    if (!accessToken) {
      console.log('No GitHub access token found in session')
      return NextResponse.json(
        { success: false, message: 'No GitHub access token found' },
        { status: 401 }
      )
    }

    // Get the GitHub username from the session or query params
    const { searchParams } = new URL(request.url)
    let username = searchParams.get('username')
    
    if (!username) {
      console.log('No username provided in query params')
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
      console.log('Manual override: Using GitHub username "Adarsh-Dhar" for testing')
    }
    
    console.log('Original username from query:', username)
    console.log('Session user data:', sessionUser)
    console.log('Using GitHub username:', githubUsername)

    console.log('Fetching GitHub PRs for username:', githubUsername)
    console.log('Using access token:', accessToken ? 'Present' : 'Missing')

    // Fetch PRs from GitHub API
    const githubUrl = `https://api.github.com/search/issues?q=type:pr+author:${githubUsername}&per_page=100&sort=created&order=desc`
    console.log('GitHub API URL:', githubUrl)
    
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    console.log('GitHub API response status:', githubResponse.status)
    console.log('GitHub API response headers:', Object.fromEntries(githubResponse.headers.entries()))

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
    console.log('GitHub API response data:', JSON.stringify(githubData, null, 2))
    console.log('Total PRs found:', githubData.total_count)
    console.log('Items in response:', githubData.items?.length || 0)
    
    if (githubData.items && githubData.items.length > 0) {
      console.log('First PR sample:', JSON.stringify(githubData.items[0], null, 2))
      console.log('Repository URL from first PR:', githubData.items[0].repository_url)
      console.log('Repository URL parts:', githubData.items[0].repository_url.split('/'))
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
      console.log('Failed to fetch existing PRs from database:', error);
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
        console.log(`Checking bounty for project: ${projectName}`)
        
        // Only projects in database have bounty enabled
        if (existingPRs.length > 0) {
          const existingPR = existingPRs.find(epr => epr.prNumber === item.number);
          if (existingPR && existingPR.Project) {
            projectHasBounty = true
            // Bounty amount will be calculated by the contribution API
            bountyAmount = 0 // Will be calculated later
            console.log(`Project ${projectName} has bounty enabled (found in database)`)
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
        console.log(`Project ${repoFullName} has bounty enabled - amount will be calculated by contribution API`)
      } else {
        console.log(`No bounty for project ${repoFullName} - not a bounty-enabled project`)
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
        console.log(`PR ${item.number} - GitHub repo: ${transformed.repository}, Database project: ${existingPR.Project?.name || 'none'}`);
        
        console.log(`PR ${item.number} found in database - Claimed: ${existingPR.bountyClaimed}, Amount: $${existingPR.amountPaid}`);
      }
      
      // Log the project ID and PR number that will be used for bounty claims
      console.log(`This PR will use Project ID: ${transformed.projectId}, PR Number: ${transformed.prNumber}`)
      
      // Log available data for bounty calculation
      console.log(`Available data for bounty calculation:`)
      console.log(`  - Additions: ${transformed.additions}`)
      console.log(`  - Deletions: ${transformed.deletions}`)
      console.log(`  - Has Tests: ${transformed.hasTests}`)
      console.log(`  - Description Length: ${transformed.description.length}`)
      console.log(`  - Commits: ${transformed.commits || 'Not available'}`)
      console.log(`  - Bounty Claimed: ${transformed.bountyClaimed}`)
      console.log(`  - Bounty Amount: $${transformed.bountyClaimedAmount}`)
      
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

    console.log('Transformed response:', JSON.stringify(response, null, 2))
    
    // Log summary of all repositories found
    console.log('=== REPOSITORY SUMMARY ===')
    const uniqueRepos = [...new Set(transformedPRs.map((pr: any) => pr.Project.name))]
    uniqueRepos.forEach(repo => {
      console.log(`Repository: ${repo}`)
    })
    console.log(`Total unique repositories: ${uniqueRepos.length}`)
    
    // Log unique IDs to check for duplicates
    console.log('=== ID UNIQUENESS CHECK ===')
    const ids = transformedPRs.map((pr: any) => pr.id)
    const uniqueIds = [...new Set(ids)]
    console.log(`Total PRs: ${ids.length}, Unique IDs: ${uniqueIds.length}`)
    if (ids.length !== uniqueIds.length) {
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
