"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, GitBranch, Users, DollarSign, Star, ExternalLink, FolderOpen, Tag, GitPullRequest } from "lucide-react"
import Link from "next/link"
import ContributorPRs, { ContributorPR } from "@/components/contributor-prs"
import { DashboardNavigation } from "@/components/dashboard-navigation"
import { useState, useEffect } from "react"

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

interface ProjectsResponse {
  success: boolean
  data: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function Page() {
  const [projectsData, setProjectsData] = useState<ProjectsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getProjectsData() {
      try {
        setLoading(true)
        setError(null)
        
        // Use absolute URL for client-side fetch
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        
        // Only fetch active projects for contributors
        const response = await fetch(`${baseUrl}/api/v1/projects?limit=100&isActive=true`, {
          cache: 'no-store', // Always fetch fresh data
        })
        
        if (!response.ok) {
          console.error('Projects API error:', response.status, response.statusText)
          setError(`API Error: ${response.status} ${response.statusText}`)
          return
        }
        
        const result = await response.json()
        if (result.success) {
          setProjectsData(result)
        } else {
          console.error('Projects API error:', result.message)
          setError(result.message || 'Failed to fetch projects')
        }
      } catch (error) {
        console.error('Projects fetch error:', error)
        setError('Failed to fetch projects. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    getProjectsData()
  }, [])

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-lg font-semibold mb-2">Loading Projects...</h2>
                <p className="text-muted-foreground">Please wait while we fetch your data.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !projectsData) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Projects</h2>
                <p className="text-muted-foreground">{error || 'Unable to fetch projects data. Please try refreshing the page.'}</p>
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

  const { data: projects, pagination } = projectsData

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl">
        {/* Sidebar (desktop) */}
        <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
        
        {/* Main */}
        <main className="flex-1 p-4 md:p-6">
          <div className="space-y-6">
            {/* Header */}
            <section>
              <h1 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
                Contributor Dashboard
              </h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Manage your contributions and track your progress across different projects.
              </p>
            </section>

            {/* Navigation Tabs */}
            <DashboardNavigation 
              onNavigate={(section) => {
                const element = document.getElementById(`${section}-section`)
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }} 
            />

            {/* Projects Section Header */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">Available Projects</h2>
                </div>
                <Button 
                  onClick={() => {
                    setLoading(true)
                    setError(null)
                    // Trigger a refresh by calling the fetch function again
                    const fetchData = async () => {
                      try {
                        const baseUrl = process.env.NODE_ENV === 'development' 
                          ? 'http://localhost:3000' 
                          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
                        
                        const response = await fetch(`${baseUrl}/api/v1/projects?limit=100&isActive=true`, {
                          cache: 'no-store',
                        })
                        
                        if (!response.ok) {
                          setError(`API Error: ${response.status} ${response.statusText}`)
                          return
                        }
                        
                        const result = await response.json()
                        if (result.success) {
                          setProjectsData(result)
                        } else {
                          setError(result.message || 'Failed to fetch projects')
                        }
                      } catch (error) {
                        setError('Failed to fetch projects. Please try again.')
                      } finally {
                        setLoading(false)
                      }
                    }
                    fetchData()
                  }}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <div className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}>
                    {loading ? '⟳' : '↻'}
                  </div>
                  Refresh
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                Browse and select projects to contribute to. Each project has different requirements and rewards.
              </p>
              
              {/* Search and Filter Bar */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {projectsData ? pagination.total : 0} active projects
                  </Badge>
                </div>
              </div>
            </section>

            {/* Projects Grid */}
            <section id="projects-section">
              {loading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardHeader className="pb-3">
                        <div className="h-6 bg-muted rounded mb-2"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                        <div className="h-8 bg-muted rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <Card key={project.id} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {project.name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            ${project.budget.toLocaleString()}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        {/* Project Tags */}
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {tag}
                              </Badge>
                            ))}
                            {project.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{project.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Project Stats */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">PRs:</span>
                            <span className="font-medium">{project._count.PullRequest}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Payouts:</span>
                            <span className="font-medium">{project._count.Payout}</span>
                          </div>
                        </div>

                        {/* Contributor Limit */}
                        {project.maxContributors && (
                          <div className="text-xs text-muted-foreground">
                            <span>Max contributors: </span>
                            <span className="font-medium">{project.maxContributors}</span>
                          </div>
                        )}

                        {/* Admin Info */}
                        <div className="text-xs text-muted-foreground">
                          <span>Managed by: </span>
                          <span className="font-medium">{project.Admin.name || project.Admin.email}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button asChild className="flex-1" size="sm">
                            <Link href={`/contributor/projects/${project.id}`}>
                              View Details
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={project.repoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Repo
                            </a>
                          </Button>
                        </div>

                        {/* Project Status */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && projects.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FolderOpen className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No active projects available</h3>
                  <p className="text-muted-foreground">
                    There are currently no active projects open for contributions.
                  </p>
                </div>
              )}
            </section>

            {/* Pagination Info */}
            {projectsData && pagination.totalPages > 1 && (
              <section className="text-center">
                <p className="text-sm text-muted-foreground">
                  Showing page {pagination.page} of {pagination.totalPages} 
                  ({pagination.total} total active projects)
                </p>
              </section>
            )}

            {/* My PRs Section */}
            <section id="prs-section" className="space-y-6 pt-8 border-t">
              <div className="flex items-center gap-2">
                <GitPullRequest className="h-6 w-6 text-primary" />
                <h2 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
                  My Pull Requests
                </h2>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Track all your contributions across different projects, view scores, and monitor your earnings.
              </p>
              
              <ContributorPRs />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
