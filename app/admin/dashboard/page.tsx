"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, GitPullRequest, Users, FolderOpen, TrendingUp, Shield, Coins, Wallet, AlertCircle } from "lucide-react"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { ContractTestPanel } from "@/components/contract-test-panel"
import { InitializeVaultButton } from "@/components/initialize-vault-button"
import { projectEscrowClient, projectEscrowUtils } from "@/lib/contract"
import { useEffect, useState } from "react"

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

// Project Escrow data structure from contract
interface ProjectEscrowData {
  projectId: number
  balance: number
  owner: string
  projectName: string
  status: 'active' | 'completed' | 'paused'
  lastActivity: string
}

// Contract status interface
interface ContractStatus {
  isVaultInitialized: boolean
  isGeneratorInitialized: boolean
  nextProjectId: number
  totalProjects: number
  totalBalance: number
}

export default function Page() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [contractData, setContractData] = useState<{
    contractStatus: ContractStatus | null
    projectEscrows: ProjectEscrowData[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get contract status and project escrow data
  const getContractData = async (): Promise<{
    contractStatus: ContractStatus | null
    projectEscrows: ProjectEscrowData[]
  }> => {
    try {
      // Check contract initialization status
      const isVaultInitialized = await projectEscrowClient.isEscrowVaultInitialized()
      const isGeneratorInitialized = await projectEscrowClient.isAutoProjectIdGeneratorInitialized()
      
      if (!isVaultInitialized || !isGeneratorInitialized) {
        return {
          contractStatus: {
            isVaultInitialized,
            isGeneratorInitialized,
            nextProjectId: 0,
            totalProjects: 0,
            totalBalance: 0
          },
          projectEscrows: []
        }
      }

      // Get contract data
      const [nextProjectId, totalProjects, totalBalance] = await Promise.all([
        projectEscrowClient.getNextProjectId(),
        projectEscrowClient.getTotalProjects(),
        projectEscrowClient.getTotalBalance()
      ])

      const contractStatus: ContractStatus = {
        isVaultInitialized,
        isGeneratorInitialized,
        nextProjectId,
        totalProjects,
        totalBalance
      }

      // Get project escrow data for each project
      const projectEscrows: ProjectEscrowData[] = []
      
      for (let i = 0; i < totalProjects; i++) {
        try {
          const [balance, owner, projectName, exists] = await Promise.all([
            projectEscrowClient.getProjectBalance(i),
            projectEscrowClient.getProjectOwner(i),
            projectEscrowClient.getProjectName(i),
            projectEscrowClient.projectExists(i)
          ])

          if (exists && owner) {
            projectEscrows.push({
              projectId: i,
              balance,
              owner,
              projectName: projectName || `Project ${i}`,
              status: balance > 0 ? 'active' : 'completed',
              lastActivity: new Date().toISOString().split('T')[0] // Placeholder - in real app would track actual activity
            })
          }
        } catch (error) {
          console.warn(`Error fetching project ${i} data:`, error)
          // Continue with other projects
        }
      }

      return { contractStatus, projectEscrows }
    } catch (error) {
      console.error('Error fetching contract data:', error)
      return { contractStatus: null, projectEscrows: [] }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [dashboardResult, contractResult] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v1/dashboard/admin`).then(res => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`)
            }
            return res.json()
          }),
          getContractData()
        ])

        if (dashboardResult.success) {
          setData(dashboardResult.data)
        } else {
          setError('Failed to fetch dashboard data.')
        }
        setContractData(contractResult)
             } catch (err) {
         const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
         setError(`Error fetching data: ${errorMessage}`)
         console.error('Dashboard fetch error:', err)
       } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">Loading Dashboard</h2>
                <p className="text-muted-foreground">Please wait while we fetch the latest data.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Dashboard</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

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

  const { contractStatus, projectEscrows } = contractData || { contractStatus: null, projectEscrows: [] }

  // Calculate escrow statistics from real contract data
  const totalEscrowBalance = projectEscrows.reduce((sum: number, escrow: ProjectEscrowData) => sum + escrow.balance, 0)
  const activeEscrows = projectEscrows.filter((escrow: ProjectEscrowData) => escrow.status === 'active').length
  const completedEscrows = projectEscrows.filter((escrow: ProjectEscrowData) => escrow.status === 'completed').length

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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
                    Admin Dashboard
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    Monitor platform performance, budgets, developer activity, and project escrows.
                  </p>
                </div>
                <div className="flex gap-2">
                  <CreateProjectDialog />
                </div>
              </div>
            </section>

            {/* Contract Initialization */}
            {contractStatus && (!contractStatus.isVaultInitialized || !contractStatus.isGeneratorInitialized) && (
              <section>
                <InitializeVaultButton
                  isVaultInitialized={contractStatus.isVaultInitialized}
                  isGeneratorInitialized={contractStatus.isGeneratorInitialized}
                  onInitialized={async () => {
                    // Refresh contract data after initialization
                    try {
                      const newContractData = await getContractData()
                      setContractData(newContractData)
                    } catch (error) {
                      console.error('Error refreshing contract data:', error)
                    }
                  }}
                />
              </section>
            )}

            {/* Contract Test Panel */}
            <section>
              <ContractTestPanel />
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
                    {contractStatus?.totalProjects || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contractStatus?.isVaultInitialized ? 'Contract active' : 'Contract inactive'}
                  </p>
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

            {/* Project Escrow Overview */}
            <section>
              <h2 className="text-lg font-medium mb-4">Project Escrow Overview</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Active Escrows
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-blue-600">
                      {activeEscrows}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {projectEscrows.length} total projects
                    </p>
                  </CardContent>
                </Card>

                <Card className="border bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Coins className="h-4 w-4 text-green-600" />
                      Total Escrow Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-green-600">
                      {projectEscrowUtils.formatApt(totalEscrowBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {projectEscrowUtils.formatApt(totalEscrowBalance)} available
                    </p>
                  </CardContent>
                </Card>

                <Card className="border bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      Next Project ID
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-purple-600">
                      {contractStatus?.nextProjectId || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto-generated IDs
                    </p>
                  </CardContent>
                </Card>

                <Card className="border bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-orange-600" />
                      Completed Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-orange-600">
                      {completedEscrows}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Zero balance projects
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Project Escrow Details */}
            <section>
              <h2 className="text-lg font-medium mb-4">Project Escrow Details</h2>
              {projectEscrows.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
                      <p className="text-muted-foreground">
                        {contractStatus?.isVaultInitialized 
                          ? "No projects have been created yet. Create your first project to get started."
                          : "Contract not initialized. Please deploy and initialize the contract first."
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectEscrows.map((escrow: ProjectEscrowData) => (
                        <TableRow key={escrow.projectId}>
                          <TableCell className="font-mono text-sm">
                            #{escrow.projectId}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {escrow.projectName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm text-muted-foreground">
                              {projectEscrowUtils.formatAddress(escrow.owner)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">
                              {projectEscrowUtils.formatApt(escrow.balance)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={escrow.status === 'active' ? 'default' : 
                                     escrow.status === 'completed' ? 'secondary' : 'outline'}
                              className={escrow.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                                       escrow.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                                       'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'}
                            >
                              {escrow.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {escrow.lastActivity}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
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
                  <CardTitle className="text-sm text-muted-foreground">Contract Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-indigo-400 mb-2">
                    {contractStatus?.isVaultInitialized && contractStatus?.isGeneratorInitialized ? 'Active' : 'Inactive'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contractStatus?.isVaultInitialized && contractStatus?.isGeneratorInitialized 
                      ? 'Contract fully operational'
                      : 'Contract needs initialization'
                    }
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
