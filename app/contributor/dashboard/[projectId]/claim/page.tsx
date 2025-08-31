"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, GitPullRequest, Calendar, User, ArrowLeft, CheckCircle, AlertCircle, Loader2, Github, ExternalLink, GitBranch, MessageSquare, Users } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

// Define the project data type based on our API response
interface Project {
  id: number
  name: string
  description: string | null
  repoUrl: string
  budget: number
  isActive: boolean
  maxContributors: number | null
  tags: string[]
  createdAt: string
  updatedAt: string
  Admin: {
    id: number
    name: string | null
    email: string
  }
  _count: {
    PullRequest: number
    Payout: number
  }
}

// Define the GitHub PR data type
interface GitHubPR {
  id: number
  number: number
  title: string
  description: string | null
  state: string
  merged: boolean
  mergedAt: string | null
  closedAt: string | null
  author: string
  headBranch: string
  baseBranch: string
  additions: number
  deletions: number
  changedFiles: number
  url: string
  createdAt: string
  updatedAt: string
  draft: boolean
  labels: string[]
  assignees: string[]
  requestedReviewers: string[]
  commits: number
  comments: number
  reviewComments: number
  repository: {
    fullName: string
    name: string
    owner: string
    url: string
  }
}

interface ClaimFormData {
  projectId: string
  prNumber: string
  prUrl: string
  description: string
  amount: string
}

export default function ClaimPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [githubToken, setGithubToken] = useState("")
  const [githubPRs, setGithubPRs] = useState<GitHubPR[]>([])
  const [fetchingPRs, setFetchingPRs] = useState(false)
  const [prsError, setPrsError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<ClaimFormData>({
    projectId: "",
    prNumber: "",
    prUrl: "",
    description: "",
    amount: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Fetch project details when component mounts
  useEffect(() => {
    async function fetchProjectDetails() {
      if (!projectId) return
      
      try {
        setLoading(true)
        setError(null)
        
        // Use absolute URL for client-side fetch
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        
        const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}`, {
          cache: 'no-store',
        })
        
        if (!response.ok) {
          console.error('Project API error:', response.status, response.statusText)
          setError(`API Error: ${response.status} ${response.statusText}`)
          return
        }
        
        const result = await response.json()
        if (result.success) {
          const projectData = result.data
          setProject(projectData)
          
          // Log project details to console
          console.log('Selected Project Details:', {
            id: projectData.id,
            name: projectData.name,
            description: projectData.description,
            repoUrl: projectData.repoUrl,
            budget: projectData.budget,
            isActive: projectData.isActive,
            maxContributors: projectData.maxContributors,
            tags: projectData.tags,
            admin: projectData.Admin,
            pullRequestCount: projectData._count.PullRequest,
            payoutCount: projectData._count.Payout,
            createdAt: projectData.createdAt,
            updatedAt: projectData.updatedAt
          })
          
          // Update form data with project ID
          setFormData(prev => ({ ...prev, projectId: projectId.toString() }))
        } else {
          console.error('Project API error:', result.message)
          setError(result.message || 'Failed to fetch project details')
        }
      } catch (error) {
        console.error('Project fetch error:', error)
        setError('Failed to fetch project details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProjectDetails()
  }, [projectId])

  // Fetch GitHub PRs when token is provided
  const fetchGitHubPRs = async () => {
    if (!githubToken.trim() || !project) return
    
    try {
      setFetchingPRs(true)
      setPrsError(null)
      
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      
      const response = await fetch(
        `${baseUrl}/api/v1/projects/${projectId}/github-prs?githubToken=${encodeURIComponent(githubToken)}&per_page=100&state=all`,
        {
          cache: 'no-store',
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (result.success) {
        setGithubPRs(result.data)
        console.log(`Successfully fetched ${result.data.length} PRs from GitHub repository:`, result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch PRs')
      }
    } catch (error) {
      console.error('Error fetching GitHub PRs:', error)
      setPrsError(error instanceof Error ? error.message : 'Failed to fetch PRs')
    } finally {
      setFetchingPRs(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setSubmitted(true)
  }

  const handleInputChange = (field: keyof ClaimFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePRSelect = (pr: GitHubPR) => {
    setFormData(prev => ({
      ...prev,
      prNumber: pr.number.toString(),
      prUrl: pr.url,
      description: pr.description || `PR #${pr.number}: ${pr.title}`
    }))
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <h2 className="text-lg font-semibold mb-2">Loading Project Details...</h2>
                <p className="text-muted-foreground">Please wait while we fetch the project information.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Project</h2>
                <p className="text-muted-foreground">{error || 'Unable to fetch project details. Please try refreshing the page.'}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-4"
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-semibold mb-4">Claim Submitted Successfully!</h1>
                <p className="text-muted-foreground mb-6">
                  Your bounty claim has been submitted and is under review. You'll receive a notification once it's processed.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/contributor/dashboard">
                      Back to Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => setSubmitted(false)}>
                    Submit Another Claim
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl">
        <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button variant="ghost" asChild className="mb-4 p-0 h-auto">
                <Link href="/contributor/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="text-3xl font-bold mb-2">Claim Your Bounty</h1>
              <p className="text-muted-foreground">
                Submit your pull request details to claim your contribution reward for <strong>{project.name}</strong>.
              </p>
            </div>

            {/* Project Info Card */}
            <Card className="mb-8 border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-blue-900 text-lg">{project.name}</h3>
                    <Badge variant="default" className="bg-green-600">
                      ${project.budget.toLocaleString()}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-blue-800">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-blue-800">
                    <span>Max Contributors: {project.maxContributors || 'Unlimited'}</span>
                    <span>PRs: {project._count.PullRequest}</span>
                    <span>Payouts: {project._count.Payout}</span>
                  </div>
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* GitHub Token Input */}
            <Card className="mb-8 border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <Github className="h-5 w-5" />
                  GitHub Repository Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-orange-900">GitHub Personal Access Token</label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="ghp_..."
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={fetchGitHubPRs}
                        disabled={!githubToken.trim() || fetchingPRs}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {fetchingPRs ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <GitPullRequest className="h-4 w-4 mr-2" />
                            Fetch PRs
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-orange-800">
                      Token must have permissions to read PRs on the repository. We'll use it to fetch all available pull requests.
                    </p>
                  </div>
                  
                  {prsError && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-md">
                      <p className="text-sm text-red-800">{prsError}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* GitHub PRs List */}
            {githubPRs.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitPullRequest className="h-5 w-5" />
                    Available Pull Requests ({githubPRs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {githubPRs.map((pr) => (
                      <div 
                        key={pr.id} 
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          formData.prNumber === pr.number.toString() 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => handlePRSelect(pr)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={pr.merged ? "default" : pr.state === "open" ? "secondary" : "outline"}>
                              {pr.merged ? "Merged" : pr.state}
                            </Badge>
                            {pr.draft && <Badge variant="outline">Draft</Badge>}
                            <span className="font-medium">#{pr.number}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{pr.author}</span>
                            <span>•</span>
                            <span>{new Date(pr.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <h4 className="font-medium mb-2">{pr.title}</h4>
                        
                        {pr.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {pr.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            <span>{pr.baseBranch} ← {pr.headBranch}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{pr.comments}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{pr.reviewComments}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>+{pr.additions} -{pr.deletions}</span>
                          </div>
                        </div>
                        
                        {pr.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pr.labels.map((label, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card className="mb-8 border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-medium text-blue-900">Before you claim:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Ensure your pull request has been merged and approved</li>
                      <li>• Verify the project requirements have been met</li>
                      <li>• Double-check the bounty amount and project details</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Claim Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Bounty Claim Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Project Selection - Now shows selected project */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project</label>
                    <div className="p-3 bg-muted rounded-md border">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Budget: ${project.budget.toLocaleString()} • ID: {project.id}
                      </div>
                    </div>
                  </div>

                  {/* PR Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pull Request Number</label>
                    <Input
                      placeholder="e.g., #123"
                      value={formData.prNumber}
                      onChange={(e) => handleInputChange('prNumber', e.target.value)}
                      required
                    />
                  </div>

                  {/* PR URL */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pull Request URL</label>
                    <Input
                      placeholder="https://github.com/username/repo/pull/123"
                      value={formData.prUrl}
                      onChange={(e) => handleInputChange('prUrl', e.target.value)}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description of Changes</label>
                    <Textarea
                      placeholder="Briefly describe what you implemented or fixed..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      required
                    />
                  </div>

                  {/* Bounty Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bounty Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className="pl-8"
                        type="number"
                        step="0.01"
                        min="0"
                        max={project.budget}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum available: ${project.budget.toLocaleString()}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting Claim...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Submit Claim
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Questions about your claim? Contact project administrators or check the project documentation.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
