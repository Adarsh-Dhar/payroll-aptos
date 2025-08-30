import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'

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
    
    // Helper function to calculate contribution score
    function calculateContributionScore(pr: any): number {
      // Calculate score based on PR complexity and quality
      let score = 0
      
      // Base score for PR creation
      score += 10
      
      // Bonus for having tests
      if (pr.hasTests) score += 20
      
      // Bonus for good PR description
      if (pr.description && pr.description.length > 100) score += 15
      
      // Bonus for code quality (based on file changes)
      const totalChanges = (pr.additions || 0) + (pr.deletions || 0)
      if (totalChanges > 0) {
        score += Math.min(20, totalChanges * 0.1) // Max 20 points for changes
      }
      
      // Bonus for good commit messages
      if (pr.commits && pr.commits.length > 0) {
        score += Math.min(15, pr.commits.length * 0.5) // Max 15 points for commits
      }
      
      return Math.min(100, score) // Cap at 100
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
    
    // Transform GitHub data to match our expected format
    const transformedPRs = githubData.items.map((item: any, index: number) => {
      // Extract repository information from the repository_url
      const repoUrlParts = item.repository_url.split('/')
      const repoOwner = repoUrlParts[repoUrlParts.length - 2]
      const repoName = repoUrlParts[repoUrlParts.length - 1]
      const repoFullName = `${repoOwner}/${repoName}`
      
      // Calculate bounty based on project settings
      let bountyAmount = 0
      let projectHasBounty = false
      
      // Check if project has bounty settings
      if (item.repository_url) {
        // Extract project name from repository URL
        const projectName = repoFullName
        console.log(`Checking bounty for project: ${projectName}`)
        
        // For now, we'll set a default bounty calculation
        // In a real implementation, you'd query the database for project settings
        // List of repositories that have bounty enabled
        const bountyEnabledRepos = [
          'devpaystream',
          'devpay',
          'Adarsh-Dhar/Project-S', // Your specific repository
          'Project-S' // Also check for just the project name
        ];
        
        // Check if repository is in the bounty-enabled list
        if (bountyEnabledRepos.some(repo => projectName.includes(repo))) {
          projectHasBounty = true
          bountyAmount = 100 // Base bounty amount
          console.log(`Project ${projectName} has bounty enabled (whitelisted)`)
        } 
        // Check if repository has significant changes
        else if ((item.additions || 0) + (item.deletions || 0) > 50) {
          projectHasBounty = true
          bountyAmount = Math.max(50, ((item.additions || 0) + (item.deletions || 0)) * 0.1)
          console.log(`Project ${projectName} has bounty for significant changes`)
        }
        // Check if it's a known project repository
        else if (projectName.includes('Project') || projectName.includes('project')) {
          projectHasBounty = true
          bountyAmount = 50 // Base bounty for project repositories
          console.log(`Project ${projectName} has bounty enabled (project repository)`)
        }
        
        // Log repository information for debugging
        console.log(`Repository URL: ${item.repository_url}`)
        console.log(`Repository owner: ${repoOwner}`)
        console.log(`Repository name: ${repoName}`)
        console.log(`Repository full name: ${repoFullName}`)
        
        // Check if this repository is registered in any project
        // This will help debug why the bounty claim is failing
        console.log(`Checking if repository ${repoFullName} is registered in any project...`)
        
        // Check against the same bounty logic
        if (bountyEnabledRepos.some(repo => repoFullName.includes(repo))) {
          console.log(`Repository ${repoFullName} appears to be a bounty-enabled project`)
        } else if (repoFullName.includes('Project') || repoFullName.includes('project')) {
          console.log(`Repository ${repoFullName} appears to be a bounty-enabled project (project repository)`)
        } else {
          console.log(`Repository ${repoFullName} is not a bounty-enabled project`)
        }
      }
      
      const transformed = {
        id: index + 1, // Generate sequential ID since GitHub doesn't provide one
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
        bountyClaimed: false, // Not applicable for GitHub data
        bountyClaimedAt: null, // Not applicable for GitHub data
        developerId: 1, // Default value
        projectId: 1, // Default value
        createdAt: item.created_at,
        updatedAt: item.updated_at,
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
      
      // Calculate bounty if project has bounty settings
      if (projectHasBounty) {
        // Calculate bounty using L + Dx/10 formula
        const additions = item.additions || 0
        const deletions = item.deletions || 0
        const totalChanges = additions + deletions
        
        // Base bounty (L) + (Dx/10) where D is deletions and x is a multiplier
        const baseBounty = 50 // Base bounty amount
        const deletionMultiplier = 0.10 // $0.10 per deletion
        const totalBounty = baseBounty + (deletions * deletionMultiplier)
        
        bountyAmount = Math.round(totalBounty * 100) / 100 // Round to 2 decimal places
        console.log(`Bounty calculated for PR ${item.number}: $${bountyAmount}`)
        console.log(`Base: $${baseBounty}, Deletions: ${deletions}, Multiplier: $${deletionMultiplier}`)
        
        // Calculate contribution score using the existing route logic
        const contributionScore = calculateContributionScore(item)
        console.log(`Contribution score for PR ${item.number}: ${contributionScore}`)
        
        // Calculate final bounty with contribution multiplier
        const finalBounty = bountyAmount * (1 + contributionScore * 0.1)
        console.log(`Final bounty for PR ${item.number}: $${finalBounty}`)
        
        // Update the transformed object with the calculated bounty
        transformed.bountyAmount = finalBounty
      } else {
        console.log(`No bounty for project ${repoFullName} - not a bounty-enabled project`)
      }
      
      // Log repository information for debugging
      console.log(`PR ${item.number} belongs to repository: ${repoFullName}`)
      console.log(`Repository URL: ${item.repository_url}`)
      console.log(`Repository owner: ${repoOwner}`)
      console.log(`Repository name: ${repoName}`)
      
      // Check if this repository is registered in any project
      // This will help debug why the bounty claim is failing
      console.log(`Checking if repository ${repoFullName} is registered in any project...`)
      
      // For now, we'll log the repository information
      // In a real implementation, you'd query the database for project repositories
      if (repoFullName.includes('devpaystream') || repoFullName.includes('devpay')) {
        console.log(`Repository ${repoFullName} appears to be a bounty-enabled project`)
      } else {
        console.log(`Repository ${repoFullName} is not a bounty-enabled project`)
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
