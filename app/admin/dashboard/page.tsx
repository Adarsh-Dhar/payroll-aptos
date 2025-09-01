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
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

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
	const { data: session, status } = useSession()
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
			// Check contract initialization status using available methods
			const nextProjectId = await projectEscrowClient.getNextProjectId()
			const totalProjects = await projectEscrowClient.getTotalProjects()
			const autoGenerator = await projectEscrowClient.getAutoProjectIdGenerator()
			
			const contractStatus: ContractStatus = {
				isVaultInitialized: nextProjectId > 0, // If we can get next project ID, vault is initialized
				isGeneratorInitialized: autoGenerator !== null,
				nextProjectId: nextProjectId || 1,
				totalProjects: totalProjects || 0,
				totalBalance: 0 // TODO: Implement total balance calculation
			}

			// Get project escrow data
			const projectEscrows: ProjectEscrowData[] = []
			if (contractStatus.totalProjects > 0) {
				for (let i = 1; i <= contractStatus.totalProjects; i++) {
					try {
						const balance = await projectEscrowClient.getProjectBalance(i)
						const owner = await projectEscrowClient.getProjectOwner(i)
						const projectName = await projectEscrowClient.getProjectName(i)
						
						if (owner && projectName) {
							projectEscrows.push({
								projectId: i,
								balance: balance || 0,
								owner: owner,
								projectName: projectName,
								status: 'active',
								lastActivity: new Date().toISOString()
							})
						}
					} catch (error) {
						console.warn(`Failed to fetch escrow data for project ${i}:`, error)
					}
				}
			}

			return { contractStatus, projectEscrows }
		} catch (error) {
			console.error('Failed to get contract data:', error)
			return { contractStatus: null, projectEscrows: [] }
		}
	}

	// Redirect to sign in if not authenticated
	useEffect(() => {
		if (status === "unauthenticated") {
			signIn("github")
		}
	}, [status])

	// Load contract data when authenticated
	useEffect(() => {
		if (status === "authenticated") {
			getContractData().then(setContractData)
		}
	}, [status])

	// Show loading while checking authentication
	if (status === "loading") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
					<p className="mt-4 text-lg">Loading...</p>
				</div>
			</div>
		)
	}

	// Show sign in prompt if not authenticated
	if (status === "unauthenticated") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Shield className="h-32 w-32 text-muted-foreground mx-auto mb-4" />
					<h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
					<p className="text-muted-foreground mb-6">
						You need to sign in with GitHub to access the admin dashboard.
					</p>
					<Button onClick={() => signIn("github")} size="lg">
						Sign in with GitHub
					</Button>
				</div>
			</div>
		)
	}

	// Show dashboard content if authenticated
	if (status === "authenticated" && session) {
		return (
			<div className="min-h-screen bg-background">
				<AppHeader />
				<div className="flex">
					<AppSidebar />
					<main className="flex-1 p-6">
						<div className="space-y-6">
							{/* Header */}
							<div className="flex items-center justify-between">
								<div>
									<h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
									<p className="text-muted-foreground">
										Welcome back, {session.user?.name || 'Admin'}! Here's what's happening with your projects.
									</p>
								</div>
								<div className="flex items-center gap-2">
									<CreateProjectDialog />
									<InitializeVaultButton 
										isVaultInitialized={contractData?.contractStatus?.isVaultInitialized || false}
										isGeneratorInitialized={contractData?.contractStatus?.isGeneratorInitialized || false}
										onInitialized={() => {
											// Refresh contract data after initialization
											getContractData()
										}}
									/>
								</div>
							</div>

							{/* Contract Status */}
							<ContractTestPanel />

							{/* Overview Cards */}
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">Total Budget</CardTitle>
										<DollarSign className="h-4 w-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">$24,000</div>
										<p className="text-xs text-muted-foreground">
											+20.1% from last month
										</p>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">Total Spent</CardTitle>
										<Coins className="h-4 w-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">$12,400</div>
										<p className="text-xs text-muted-foreground">
											+8.2% from last month
										</p>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">Active Projects</CardTitle>
										<FolderOpen className="h-4 w-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">12</div>
										<p className="text-xs text-muted-foreground">
											+2 new this month
										</p>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">Total Developers</CardTitle>
										<Users className="h-4 w-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">48</div>
										<p className="text-xs text-muted-foreground">
											+12 new this month
										</p>
									</CardContent>
								</Card>
							</div>

							{/* PR Activity */}
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
								<Card className="col-span-4">
									<CardHeader>
										<CardTitle>Pull Request Activity</CardTitle>
									</CardHeader>
									<CardContent className="pl-2">
										<div className="space-y-4">
											<div className="flex items-center space-x-4">
												<div className="space-y-2">
													<p className="text-sm font-medium leading-none">Open PRs</p>
													<p className="text-xs text-muted-foreground">
														Currently open pull requests
													</p>
												</div>
												<div className="ml-auto font-medium">23</div>
											</div>
											<div className="flex items-center space-x-4">
												<div className="space-y-2">
													<p className="text-sm font-medium leading-none">Merged PRs</p>
													<p className="text-xs text-muted-foreground">
														Successfully merged this month
													</p>
												</div>
												<div className="ml-auto font-medium">18</div>
											</div>
											<div className="flex items-center space-x-4">
												<div className="space-y-2">
													<p className="text-sm font-medium leading-none">Average Score</p>
													<p className="text-xs text-muted-foreground">
														Quality score of submitted PRs
													</p>
												</div>
												<div className="ml-auto font-medium">8.4/10</div>
											</div>
										</div>
									</CardContent>
								</Card>
								<Card className="col-span-3">
									<CardHeader>
										<CardTitle>Recent Activity</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											<div className="flex items-center space-x-4">
												<GitPullRequest className="h-4 w-4 text-green-600" />
												<div className="space-y-1">
													<p className="text-sm font-medium leading-none">New PR #45</p>
													<p className="text-xs text-muted-foreground">
														Feature: Add user authentication
													</p>
												</div>
											</div>
											<div className="flex items-center space-x-4">
												<DollarSign className="h-4 w-4 text-blue-600" />
												<div className="space-y-1">
													<p className="text-sm font-medium leading-none">Payout Sent</p>
													<p className="text-xs text-muted-foreground">
														$500 to @developer123
													</p>
												</div>
											</div>
											<div className="flex items-center space-x-4">
												<Users className="h-4 w-4 text-purple-600" />
												<div className="space-y-1">
													<p className="text-sm font-medium leading-none">New Developer</p>
													<p className="text-xs text-muted-foreground">
														@newcoder joined project
													</p>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Project Performance */}
							<Card>
								<CardHeader>
									<CardTitle>Project Performance</CardTitle>
								</CardHeader>
								<CardContent>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Project</TableHead>
												<TableHead>Budget</TableHead>
												<TableHead>PRs</TableHead>
												<TableHead>Merged</TableHead>
												<TableHead>Utilization</TableHead>
												<TableHead>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											<TableRow>
												<TableCell className="font-medium">Web3 Dashboard</TableCell>
												<TableCell>$5,000</TableCell>
												<TableCell>8</TableCell>
												<TableCell>6</TableCell>
												<TableCell>
													<Progress value={75} className="w-[60px]" />
													<span className="ml-2 text-sm">75%</span>
												</TableCell>
												<TableCell>
													<Badge variant="secondary">Active</Badge>
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell className="font-medium">Mobile App</TableCell>
												<TableCell>$3,000</TableCell>
												<TableCell>5</TableCell>
												<TableCell>3</TableCell>
												<TableCell>
													<Progress value={60} className="w-[60px]" />
													<span className="ml-2 text-sm">60%</span>
												</TableCell>
												<TableCell>
													<Badge variant="secondary">Active</Badge>
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell className="font-medium">API Service</TableCell>
												<TableCell>$2,500</TableCell>
												<TableCell>3</TableCell>
												<TableCell>2</TableCell>
												<TableCell>
													<Progress value={40} className="w-[60px]" />
													<span className="ml-2 text-sm">40%</span>
												</TableCell>
												<TableCell>
													<Badge variant="outline">Planning</Badge>
												</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</CardContent>
							</Card>

							{/* Top Developers */}
							<Card>
								<CardHeader>
									<CardTitle>Top Performing Developers</CardTitle>
								</CardHeader>
								<CardContent>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Developer</TableHead>
												<TableHead>Total PRs</TableHead>
												<TableHead>Merged</TableHead>
												<TableHead>Total Earnings</TableHead>
												<TableHead>Avg Score</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											<TableRow>
												<TableCell className="font-medium">@alice_dev</TableCell>
												<TableCell>12</TableCell>
												<TableCell>10</TableCell>
												<TableCell>$2,400</TableCell>
												<TableCell>9.2</TableCell>
											</TableRow>
											<TableRow>
												<TableCell className="font-medium">@bob_coder</TableCell>
												<TableCell>8</TableCell>
												<TableCell>7</TableCell>
												<TableCell>$1,800</TableCell>
												<TableCell>8.8</TableCell>
											</TableRow>
											<TableRow>
												<TableCell className="font-medium">@charlie_web</TableCell>
												<TableCell>6</TableCell>
												<TableCell>5</TableCell>
												<TableCell>$1,200</TableCell>
												<TableCell>8.5</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</div>
					</main>
				</div>
			</div>
		)
	}

	return null
}
