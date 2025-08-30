"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Search, GitBranch, GitPullRequest, GitMerge, DollarSign, Star, ExternalLink, Calendar } from 'lucide-react'
import Link from 'next/link'

export type ContributorPR = {
  id: number
  prNumber: number
  title: string
  description: string
  additions: number
  deletions: number
  hasTests: boolean
  linkedIssue: string
  merged: boolean
  score: number
  amountPaid: number
  bountyAmount: number
  bountyClaimed: boolean
  bountyClaimedAt: string | null
  developerId: number
  projectId: number
  createdAt: string
  updatedAt: string
  Project: {
    id: number
    name: string
    repoUrl: string
    lowestBounty: number
    highestBounty: number
  }
  Developer: {
    id: number
    username: string
    githubId: string
  }
}

type PRsData = {
  data: ContributorPR[]
  stats: {
    totalPRs: number
    mergedPRs: number
    openPRs: number
    totalEarnings: number
    averageScore: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ContributorPRs() {
  const { data: session } = useSession()
  const [prsData, setPrsData] = useState<PRsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [claimingBounty, setClaimingBounty] = useState<number | null>(null)

  const fetchPRs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get GitHub username from session
      const sessionUser = session?.user as any
      let githubUsername = 'alice-dev' // fallback for testing
      
      // Try to get the actual GitHub username from the session
      if (sessionUser?.githubUsername) {
        githubUsername = sessionUser.githubUsername
      } else if (sessionUser?.login) {
        githubUsername = sessionUser.login
      } else if (sessionUser?.name) {
        // Convert display name to GitHub username format (e.g., "Adarsh Dhar" -> "Adarsh-Dhar")
        githubUsername = sessionUser.name.replace(/\s+/g, '-')
      }
      
      console.log('Session user:', sessionUser)
      console.log('Using GitHub username:', githubUsername)
      
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      
      // Try GitHub API first
      try {
        const githubResponse = await fetch(
          `${baseUrl}/api/v1/contributor/github-prs?username=${encodeURIComponent(githubUsername)}`,
          {
            credentials: 'include' // Include session cookies
          }
        )

        if (githubResponse.ok) {
          const result = await githubResponse.json()
          if (result.success) {
            console.log('GitHub PRs fetched successfully:', result)
            setPrsData(result)
            return
          }
        }
        
        // If GitHub API fails, log the error and try database fallback
        console.log('GitHub API failed, trying database fallback...')
        const errorText = await githubResponse.text()
        console.log('GitHub API error:', errorText)
        
      } catch (githubError) {
        console.log('GitHub API request failed:', githubError)
      }

      // Fallback to database API
      console.log('Fetching from database API...')
      const dbResponse = await fetch(
        `${baseUrl}/api/v1/contributor/prs?limit=100`,
        {
          credentials: 'include'
        }
      )

      if (!dbResponse.ok) {
        throw new Error(`HTTP error! status: ${dbResponse.status}`)
      }

      const result = await dbResponse.json()
      if (result.success) {
        console.log('Database PRs fetched successfully:', result)
        console.log('PRs data structure:', result.data)
        console.log('First PR example:', result.data?.[0])
        setPrsData(result)
      } else {
        console.error('Database PRs API error:', result.message)
        setError(result.message || 'Failed to fetch PRs')
      }
    } catch (error) {
      console.error('Error fetching PRs:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch PRs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchPRs()
    }
  }, [session])

  const filteredPRs = prsData?.data?.filter(pr => {
    // Safety check: ensure pr exists and has required properties
    if (!pr || !pr.title) return false
    
    // Additional safety check: ensure Project relation exists
    if (!pr.Project || !pr.Project.id) return false
    
    const matchesSearch = !searchTerm || 
      pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pr.description && pr.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "merged" && pr.merged) ||
      (statusFilter === "open" && !pr.merged)
    
    const matchesProject = projectFilter === "all" || 
      pr.projectId?.toString() === projectFilter
    
    return matchesSearch && matchesStatus && matchesProject
  }) || []

  const uniqueProjects = prsData?.data?.reduce((projects, pr) => {
    // Safety check: ensure pr and pr.Project exist
    if (!pr || !pr.Project || !pr.Project.id) return projects
    
    // Check if we already have this project in our array
    if (!projects.find(p => p.id === pr.projectId)) {
      projects.push(pr.Project)
    }
    return projects
  }, [] as typeof prsData.data[0]['Project'][]) || []

  const handleClaimBounty = async (pr: ContributorPR) => {
    if (!pr.merged || pr.bountyClaimed) return

    setClaimingBounty(pr.id)
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      
      // Prepare the request data
      const requestData = {
        prNumber: pr.prNumber,
        repository: pr.Project.name, // This contains the repository name like "owner/repo"
        additions: pr.additions,
        deletions: pr.deletions,
        hasTests: pr.hasTests,
        description: pr.description,
        commits: [], // Empty array for now since commits field doesn't exist yet
        githubUrl: pr.linkedIssue // This contains the GitHub PR URL
      };
      
      console.log('Sending bounty claim request:', requestData);
      console.log('Request URL:', `${baseUrl}/api/v1/contributor/github-prs/claim-bounty`);
      
      // Call the new GitHub PR bounty claim endpoint
      const response = await fetch(
        `${baseUrl}/api/v1/contributor/github-prs/claim-bounty`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        }
      )

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      let result;
      try {
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (responseText.trim()) {
          result = JSON.parse(responseText);
        } else {
          result = { success: false, message: 'Empty response from server' };
        }
      } catch (error) {
        console.error('Failed to parse response:', error);
        result = { success: false, message: 'Invalid response from server' };
      }
      
      if (result.success) {
        console.log('Bounty claimed successfully:', result)
        // Show success message with bounty amount
        alert(`Bounty claimed successfully! Amount: $${result.data.bountyAmount}`)
        // Refresh the PRs data to show updated bounty status
        await fetchPRs()
      } else {
        console.error('Failed to claim bounty:', result.message)
        alert(`Failed to claim bounty: ${result.message}`)
      }
    } catch (error) {
      console.error('Error claiming bounty:', error)
      alert('Error claiming bounty. Please try again.')
    } finally {
      setClaimingBounty(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Pull Requests</h2>
        <Button onClick={fetchPRs} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
          <Button 
            onClick={fetchPRs} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Not Authenticated Message */}
      {!session && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <span>⚠️</span>
            <span className="font-medium">Not Authenticated:</span>
            <span>Please sign in with GitHub to view your real-time pull requests.</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-10 w-64" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
            
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="p-6">
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && prsData && (
        <>
          {/* Data Source Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <span>📊</span>
              <span>
                {prsData.data.length > 0 && prsData.data[0].amountPaid > 0 
                  ? 'Showing PRs from database (with payment data)'
                  : 'Showing PRs from GitHub API (real-time data)'
                }
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4" />
                  Total PRs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{prsData.stats.totalPRs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Merged PRs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{prsData.stats.mergedPRs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{prsData.stats.averageScore}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${prsData.stats.totalEarnings.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search PRs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="merged">Merged</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {uniqueProjects.filter(project => project && project.id && project.name).map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PRs Table */}
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[12%]">PR #</TableHead>
                  <TableHead className="w-[30%]">Title & Project</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[12%]">Score</TableHead>
                  <TableHead className="w-[20%]">Bounty</TableHead>
                  <TableHead className="w-[14%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPRs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all" || projectFilter !== "all" 
                          ? "No PRs match your filters." 
                          : "No pull requests found."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPRs.map((pr, idx) => (
                    <motion.tr
                      key={pr.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b transition-colors hover:bg-muted/10"
                    >
                      <TableCell className="font-medium">
                        #{pr.prNumber}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[52ch]">
                          <div className="text-sm font-medium leading-6">{pr.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {pr.Project?.name || 'Unknown Project'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-6 px-2 text-xs"
                            >
                              <a 
                                href={pr.Project?.repoUrl || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                          {pr.description && (
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                              {pr.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pr.merged ? "default" : "secondary"}>
                          {pr.merged ? "Merged" : "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{pr.score || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {pr.bountyClaimed ? (
                            <div className="text-green-600 font-medium">
                              ${(pr.bountyAmount || 0).toLocaleString()} Claimed
                            </div>
                          ) : pr.merged ? (
                            <div className="space-y-1">
                              <div className="font-medium text-blue-600">
                                ${(pr.bountyAmount || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Bounty Range: ${pr.Project?.lowestBounty?.toLocaleString() || '0'} - ${pr.Project?.highestBounty?.toLocaleString() || '0'}
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              Not merged yet
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {pr.merged && !pr.bountyClaimed ? (
                            <Button
                              onClick={() => handleClaimBounty(pr)}
                              disabled={claimingBounty === pr.id}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {claimingBounty === pr.id ? (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Claiming...
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-3 w-3" />
                                  Claim Reward
                                </div>
                              )}
                            </Button>
                          ) : pr.bountyClaimed ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              ✓ Claimed
                            </Badge>
                          ) : (
                            <Button
                              onClick={() => handleClaimBounty(pr)}
                              disabled={claimingBounty === pr.id || !pr.merged}
                              size="sm"
                              variant={pr.merged ? "default" : "outline"}
                              className={pr.merged ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                            >
                              {claimingBounty === pr.id ? (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Claiming...
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-3 w-3" />
                                  {pr.merged ? "Claim Reward" : "Merge Required"}
                                </div>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Info */}
          {prsData.pagination.totalPages > 1 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Showing page {prsData.pagination.page} of {prsData.pagination.totalPages} 
                ({prsData.pagination.total} total PRs)
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
