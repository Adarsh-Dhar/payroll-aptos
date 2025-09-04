"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DollarSign, Calendar, User, CheckCircle, Loader2, Github, ExternalLink, Search, Filter } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

// Define the project data type based on our API response
interface Project {
  id: number
  name: string
  description: string | null
  repoUrl: string
  // no USD funding tracked
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

export default function Page() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterActive, setFilterActive] = useState(true)

  // Fetch projects when component mounts
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        setError(null)
        
        // Use absolute URL for client-side fetch
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        
        const response = await fetch(`${baseUrl}/api/v1/projects`, {
          cache: 'no-store',
        })
        
        if (!response.ok) {
          console.error('Projects API error:', response.status, response.statusText)
          setError(`API Error: ${response.status} ${response.statusText}`)
          return
        }
        
        const result = await response.json()
        if (result.success) {
          setProjects(result.data)
          console.log(`Successfully fetched ${result.data.length} projects`)
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

    fetchProjects()
  }, [])

  // Filter projects based on search term and active status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFilter = filterActive ? project.isActive : true
    
    return matchesSearch && matchesFilter
  })

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
                <h2 className="text-lg font-semibold mb-2">Loading Projects...</h2>
                <p className="text-muted-foreground">Please wait while we fetch available projects.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Projects</h2>
                <p className="text-muted-foreground">{error}</p>
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

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl">
        <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Available Projects</h1>
              <p className="text-muted-foreground">
                Browse and claim bounties for your contributions to these open source projects.
              </p>
            </div>

            {/* Search and Filter Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterActive ? "default" : "outline"}
                  onClick={() => setFilterActive(true)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Active Only
                </Button>
                <Button
                  variant={!filterActive ? "default" : "outline"}
                  onClick={() => setFilterActive(false)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  All Projects
                </Button>
              </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterActive 
                    ? "Try adjusting your search terms or filters." 
                    : "No projects are currently available."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2 mb-2">{project.name}</CardTitle>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={project.isActive ? "default" : "secondary"}>
                              {project.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {/* USD funding removed */}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Description */}
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {project.description}
                        </p>
                      )}
                      
                      {/* Repository Info */}
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <Github className="h-4 w-4" />
                        <a 
                          href={project.repoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {project.repoUrl.replace('https://github.com/', '')}
                        </a>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                      
                      {/* Project Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-muted-foreground">
                        <div className="text-center">
                          <div className="font-medium text-foreground">{project._count.PullRequest}</div>
                          <div>PRs</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-foreground">{project._count.Payout}</div>
                          <div>Payouts</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-foreground">
                            {project.maxContributors || '∞'}
                          </div>
                          <div>Max Devs</div>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {project.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {project.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{project.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Project Meta */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{project.Admin.name || project.Admin.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          asChild 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={!project.isActive}
                        >
                          <Link href={`/contributor/dashboard/${project.id}/claim`}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Claim Bounty
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          asChild
                        >
                          <Link href={`/contributor/projects/${project.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary Stats */}
            {filteredProjects.length > 0 && (
              <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{filteredProjects.length}</div>
                    <div className="text-sm text-muted-foreground">Total Projects</div>
                  </div>
                  <div>
                    {/* Removed total USD funding summary */}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredProjects.reduce((sum, p) => sum + p._count.PullRequest, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total PRs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {filteredProjects.reduce((sum, p) => sum + p._count.Payout, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Payouts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Found a project you&apos;ve contributed to? Click &quot;Claim Bounty&quot; to submit your contribution for review.</p>
              <p className="mt-2">Need help? Check the project documentation or contact project administrators.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
