import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, GitPullRequest, Users, FolderOpen, TrendingUp } from "lucide-react"

// Define the data types based on our API response
interface DashboardData {
  overview: {
    totalBudget: number
    totalSpent: number
    remainingBudget: number
    totalProjects: number
    totalDevelopers: number
    totalPRs: number
    mergedPRs: number
    openPRs: number
  }
  recentActivity: {
    pullRequests: number
    payouts: number
    newDevelopers: number
  }
  monthlyTrends: Array<{
    month: string
    pullRequests: number
    payouts: number
    mergedPRs: number
  }>
  topDevelopers: Array<{
    id: number
    username: string
    githubId: string
    totalEarnings: number
    totalPRs: number
    totalPayouts: number
    averageEarnings: number
  }>
  projectPerformance: Array<{
    id: number
    name: string
    budget: number
    totalPRs: number
    mergedPRs: number
    totalPayouts: number
    budgetUtilization: number
    averageScore: number
  }>
  quickStats: {
    averagePRScore: number
    averagePayoutAmount: number
    projectSuccessRate: number
    budgetUtilizationRate: number
  }
}

async function getDashboardData(): Promise<DashboardData | null> {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/v1/dashboard/admin`, {
      cache: 'no-store', // Always fetch fresh data
    })
    
    if (!response.ok) {
      console.error('Dashboard API error:', response.status, response.statusText)
      return null
    }
    
    const result = await response.json()
    if (result.success) {
      return result.data
    } else {
      console.error('Dashboard API error:', result.message)
      return null
    }
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return null
  }
}

export default async function Page() {
  const data = await getDashboardData()

  if (!data) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Dashboard</h2>
                <p className="text-muted-foreground">Unable to fetch dashboard data. Please try refreshing the page.</p>
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
        {/* Sidebar (desktop) */}
        <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
        
        {/* Main */}
        <main className="flex-1 p-4 md:p-6">
          <div className="space-y-6">
            {/* Header */}
            <section>
              <h1 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Monitor platform performance, budgets, and developer activity.
              </p>
            </section>

            {/* Overview Cards */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-1">
                    ${data.overview.totalBudget.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${data.overview.remainingBudget.toLocaleString()} remaining
                  </p>
                </CardContent>
              </Card>

              <Card className="border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Total Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {data.overview.totalProjects}
                  </div>
                </CardContent>
              </Card>

              <Card className="border bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Developers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {data.overview.totalDevelopers}
                  </div>
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
                    {data.overview.totalPRs}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.overview.mergedPRs} merged
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Performance Metrics */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Budget Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-2">
                    {data.quickStats.budgetUtilizationRate.toFixed(1)}%
                  </div>
                  <Progress value={data.quickStats.budgetUtilizationRate} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    ${data.overview.totalSpent.toLocaleString()} of ${data.overview.totalBudget.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">PR Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold mb-2">
                    {data.quickStats.projectSuccessRate.toFixed(1)}%
                  </div>
                  <Progress value={data.quickStats.projectSuccessRate} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.overview.mergedPRs} of {data.overview.totalPRs} PRs merged
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Average PR Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-indigo-400">
                    {data.quickStats.averagePRScore.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Quality score out of 10
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Monthly Trends */}
            <section>
              <h2 className="text-lg font-medium mb-4">Monthly Trends</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {data.monthlyTrends.map((month, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">{month.month}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>PRs:</span>
                        <span className="font-medium">{month.pullRequests}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Payouts:</span>
                        <span className="font-medium">${month.payouts.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Top Developers */}
            <section>
              <h2 className="text-lg font-medium mb-4">Top Performing Developers</h2>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Developer</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>PRs</TableHead>
                      <TableHead>Payouts</TableHead>
                      <TableHead>Avg Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topDevelopers.map((developer) => (
                      <TableRow key={developer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{developer.username}</div>
                            <div className="text-sm text-muted-foreground">@{developer.githubId}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${developer.totalEarnings.toLocaleString()}
                        </TableCell>
                        <TableCell>{developer.totalPRs}</TableCell>
                        <TableCell>{developer.totalPayouts}</TableCell>
                        <TableCell>
                          ${developer.averageEarnings.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </section>

            {/* Project Performance */}
            <section>
              <h2 className="text-lg font-medium mb-4">Project Performance</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.projectPerformance.map((project) => (
                  <Card key={project.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{project.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Budget:</span>
                        <span className="font-medium">${project.budget.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Utilization:</span>
                        <span className="font-medium">{project.budgetUtilization.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>PRs:</span>
                        <span className="font-medium">{project.totalPRs} ({project.mergedPRs} merged)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Avg Score:</span>
                        <span className="font-medium">{project.averageScore}</span>
                      </div>
                      <Progress value={project.budgetUtilization} className="h-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
