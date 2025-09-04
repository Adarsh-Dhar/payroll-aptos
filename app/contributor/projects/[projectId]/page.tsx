import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  GitBranch, 
  Users, 
  DollarSign, 
  ExternalLink, 
  Calendar,
  GitPullRequest,
  Star,
  TrendingUp,
  ArrowLeft,
  Tag
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

// Define the project data types
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
  admin: {
    id: number
    name: string | null
    email: string
  }
  _count: {
    pullRequests: number
    payouts: number
  }
  pullRequests: Array<{
    id: number
    prNumber: number
    title: string
    merged: boolean
    score: number
    amountPaid: number
    createdAt: string
    developer: {
      id: number
      username: string
      githubId: string
    }
  }>
  payouts: Array<{
    id: string
    amount: number
    paidAt: string
    status: string
    developer: {
      id: number
      username: string
      githubId: string
    }
  }>
}

interface ProjectResponse {
  success: boolean
  data: Project
}

async function getProjectData(projectId: string): Promise<ProjectResponse | null> {
  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}`, {
      cache: 'no-store',
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      console.error('Project API error:', response.status, response.statusText)
      return null
    }
    
    const result = await response.json()
    if (result.success) {
      return result
    } else {
      console.error('Project API error:', result.message)
      return null
    }
  } catch (error) {
    console.error('Project fetch error:', error)
    return null
  }
}

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectData = await getProjectData(params.projectId)

  if (!projectData) {
    notFound()
  }

  const { data: project } = projectData

  // Calculate project statistics
  const mergedPRs = project.pullRequests.filter(pr => pr.merged).length
  const totalEarnings = project.payouts.reduce((sum, p) => sum + p.amount, 0)
  const budgetRemaining = 0
  const budgetUtilization = 0
  const averageScore = project.pullRequests.length > 0 ? 
    project.pullRequests.reduce((sum, pr) => sum + pr.score, 0) / project.pullRequests.length : 0

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl">
        {/* Main */}
        <main className="flex-1 p-4 md:p-6">
          <div className="space-y-6">
            {/* Back Button */}
            <div>
              <Button variant="ghost" asChild className="mb-4">
                <Link href="/contributor/dashboard" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Projects
                </Link>
              </Button>
            </div>

            {/* Project Header */}
            <section>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h1 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">
                    {project.name}
                  </h1>
                  {project.description && (
                    <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
                      {project.description}
                    </p>
                  )}
                  {/* Project Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Managed by {project.admin.name || project.admin.email}
                    </span>
                    {project.maxContributors && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Max {project.maxContributors} contributors
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <a 
                      href={project.repoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Repository
                    </a>
                  </Button>
                  <Button className="flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4" />
                    Contribute
                  </Button>
                </div>
              </div>
            </section>

            {/* Project Stats Cards */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Funding (APT)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-1">
                    On-chain escrow only
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${budgetRemaining.toLocaleString()} remaining
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4" />
                    Pull Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-1">
                    {project._count.pullRequests}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mergedPRs} merged
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Avg Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-indigo-400">
                    {averageScore.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Out of 10
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget Used
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-1">
                    {budgetUtilization.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${totalEarnings.toLocaleString()} spent
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Project Details Tabs */}
            <section>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="prs">Pull Requests</TabsTrigger>
                  <TabsTrigger value="payouts">Payouts</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Repository</h4>
                          <a 
                            href={project.repoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            {project.repoUrl}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Project Admin</h4>
                          <p className="text-muted-foreground">
                            {project.admin.name || project.admin.email}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Status</h4>
                          <Badge variant={project.isActive ? "default" : "secondary"}>
                            {project.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Max Contributors</h4>
                          <p className="text-muted-foreground">
                            {project.maxContributors ? project.maxContributors : "Unlimited"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Created</h4>
                          <p className="text-muted-foreground">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Last Updated</h4>
                          <p className="text-muted-foreground">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="prs" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Pull Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {project.pullRequests.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>PR #</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Developer</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {project.pullRequests.slice(0, 10).map((pr) => (
                              <TableRow key={pr.id}>
                                <TableCell className="font-medium">
                                  #{pr.prNumber}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {pr.title}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{pr.developer.username}</span>
                                    <Badge variant="outline" className="text-xs">
                                      @{pr.developer.githubId}
                                    </Badge>
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
                                    {pr.score}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  ${pr.amountPaid.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No pull requests yet.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payouts" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Payouts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {project.payouts.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Developer</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {project.payouts.slice(0, 10).map((payout) => (
                              <TableRow key={payout.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{payout.developer.username}</span>
                                    <Badge variant="outline" className="text-xs">
                                      @{payout.developer.githubId}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  ${payout.amount.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={payout.status === 'completed' ? "default" : "secondary"}>
                                    {payout.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(payout.paidAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No payouts yet.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>

            {/* Call to Action */}
            <section className="text-center py-8">
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">Ready to contribute?</h3>
                  <p className="text-muted-foreground mb-4">
                    This project is actively seeking contributors. Start by exploring the repository and finding issues to work on.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button size="lg" asChild>
                      <a 
                        href={project.repoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Explore Repository
                      </a>
                    </Button>
                    <Button variant="outline" size="lg">
                      <GitPullRequest className="h-4 w-4 mr-2" />
                      Start Contributing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
