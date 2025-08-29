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

    // Transform GitHub data to match our expected format
    const transformedPRs = githubData.items.map((item: any, index: number) => {
      // Extract repository information from the repository_url
      const repoUrlParts = item.repository_url.split('/')
      const repoOwner = repoUrlParts[repoUrlParts.length - 2]
      const repoName = repoUrlParts[repoUrlParts.length - 1]
      const repoFullName = `${repoOwner}/${repoName}`
      
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
        developerId: 1, // Default value
        projectId: 1, // Default value
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        project: {
          id: 1,
          name: repoFullName,
          repoUrl: `https://github.com/${repoFullName}`
        },
        developer: {
          id: 1,
          username: githubUsername,
          githubId: githubUsername
        }
      }
      console.log(`Transformed PR ${index + 1}:`, transformed)
      console.log(`Repository info for PR ${index + 1}:`, {
        repository_url: item.repository_url,
        repoOwner,
        repoName,
        repoFullName
      })
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
