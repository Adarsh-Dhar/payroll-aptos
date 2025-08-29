"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, DollarSign, GitPullRequest, Users, FolderOpen } from "lucide-react"

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

export function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"admin" | "developer">("admin")

  useEffect(() => {
    fetchDashboardData()
  }, [view])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // For now, we'll use the admin endpoint
      // In a real app, you'd determine this based on user role
      const endpoint = view === "admin" 
        ? "/api/v1/dashboard/admin"
        : "/api/v1/dashboard/developer/1" // Example developer ID
      
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.message || "Failed to fetch dashboard data")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No dashboard data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
              {view === "admin" ? "Admin Dashboard" : "Developer Dashboard"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {view === "admin" 
                ? "Monitor platform performance, budgets, and developer activity."
                : "Track your contributions, earnings, and project performance."
              }
            </p>
          </div>
          
          <Tabs value={view} onValueChange={(value) => setView(value as "admin" | "developer")}>
            <TabsList>
              <TabsTrigger value="admin">Admin View</TabsTrigger>
              <TabsTrigger value="developer">Developer View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Overview Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Budget"
          value={`$${data.overview.totalBudget.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
          trend={data.overview.remainingBudget > 0 ? "positive" : "negative"}
          subtitle={`$${data.overview.remainingBudget.toLocaleString()} remaining`}
        />
        
        <MetricCard
          title="Total Projects"
          value={data.overview.totalProjects.toString()}
          icon={<FolderOpen className="h-4 w-4" />}
          trend="neutral"
        />
        
        <MetricCard
          title="Total Developers"
          value={data.overview.totalDevelopers.toString()}
          icon={<Users className="h-4 w-4" />}
          trend="neutral"
        />
        
        <MetricCard
          title="Pull Requests"
          value={data.overview.totalPRs.toString()}
          icon={<GitPullRequest className="h-4 w-4" />}
          trend="neutral"
          subtitle={`${data.overview.mergedPRs} merged`}
        />
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
  )
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle 
}: { 
  title: string
  value: string
  icon: React.ReactNode
  trend: "positive" | "negative" | "neutral"
  subtitle?: string
}) {
  return (
    <Card className="border bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold mb-1">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend !== "neutral" && (
          <div className="flex items-center gap-1 mt-2">
            {trend === "positive" ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={`text-xs ${trend === "positive" ? "text-green-600" : "text-red-600"}`}>
              {trend === "positive" ? "Good" : "Attention needed"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
