"use client"

import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Wallet } from "lucide-react"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { projectEscrowClient, projectEscrowUtils } from "@/lib/contract"
import { useEffect, useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

// Define the data types based on our API response
// interface DashboardData {
//   overview: {
//     totalInitialFunding: number // deprecated, server returns 0 now
//     totalSpent: number
//     remainingInitialFunding: number // deprecated, server returns 0 now
//     totalProjects: number
//     totalDevelopers: number
//     totalPRs: number
//     mergedPRs: number
//     openPRs: number
//   }
//   recentActivity: {
//     pullRequests: number
//     payouts: number
//     newDevelopers: number
//   }
//   monthlyTrends: Array<{
//     month: string
//     pullRequests: number
//     payouts: number
//     mergedPRs: number
//   }>
//   topDevelopers: Array<{
//     id: number
//     username: string
//     githubId: string
//     totalEarnings: number
//     totalPRs: number
//     totalPayouts: number
//     averageEarnings: number
//   }>
//   projectPerformance: Array<{
//     id: number
//     name: string
//     initialFunding: number // deprecated, server omits
//     totalPRs: number
//     mergedPRs: number
//     totalPayouts: number
//     budgetUtilization: number
//     averageScore: number
//   }>
//   quickStats: {
//     averagePRScore: number
//     averagePayoutAmount: number
//     projectSuccessRate: number
//     fundingUtilizationRate: number // deprecated, server returns payout-based metrics
//   }
// }

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
  nextProjectId: number
  totalProjects: number
  totalBalance: number
}

export default function Page() {
	const { data: session, status } = useSession()
	const { connected, account, signAndSubmitTransaction } = useWallet()
	const [contractData, setContractData] = useState<{
		contractStatus: ContractStatus | null
		projectEscrows: ProjectEscrowData[]
	} | null>(null)
	const [, setLoading] = useState(true)
	const [fundOpen, setFundOpen] = useState(false)
	const [fundProject, setFundProject] = useState<ProjectEscrowData | null>(null)
	const [fundAmount, setFundAmount] = useState("")
	const [funding, setFunding] = useState(false)
	const [fundError, setFundError] = useState<string | null>(null)

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
			
			const totalBalance = await projectEscrowClient.getTotalBalance()
			const contractStatus: ContractStatus = {
				nextProjectId: nextProjectId || 1,
				totalProjects: totalProjects || 0,
				totalBalance: totalBalance || 0
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

	async function handleFundSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		if (!connected || !account || !signAndSubmitTransaction || !fundProject) {
			setFundError("Connect your wallet")
			return
		}
		const amountNum = Number(fundAmount)
		if (!amountNum || amountNum <= 0) {
			setFundError("Enter a valid APT amount")
			return
		}
		setFundError(null)
		setFunding(true)
		try {
			const res = await projectEscrowClient.fundProjectWithWallet(
				account.address.toString(),
				signAndSubmitTransaction,
				fundProject.projectId,
				amountNum
			)
			if (!res.success) {
				throw new Error(res.error || "Funding failed")
			}
			const refreshed = await getContractData()
			setContractData(refreshed)
			setFundOpen(false)
			setFundProject(null)
			setFundAmount("")
			} catch (err: unknown) {
				setFundError(err instanceof Error ? err.message : "Failed to fund project")
		} finally {
			setFunding(false)
		}
	}

	// Load contract data when authenticated
	useEffect(() => {
		if (status === "authenticated") {
			getContractData().then((res) => {
				setContractData(res)
				setLoading(false)
			})
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
					<main className="flex-1 p-6">
						<div className="space-y-6">
							{/* Header */}
							<div className="flex items-center justify-between">
								<div>
									<h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
									<p className="text-muted-foreground">
										Welcome back, {session.user?.name || 'Admin'}! Here&apos;s what&apos;s happening with your projects.
									</p>
								</div>
								<div className="flex items-center gap-2">
									<CreateProjectDialog />
								</div>
							</div>


							{/* Overview */}
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<h2 className="text-lg font-semibold">Your Projects</h2>
										<div className="text-sm text-muted-foreground">
											{connected && account ? (
												<span>Wallet: {account.address.toString().slice(0,6)}...{account.address.toString().slice(-4)}</span>
											) : (
												<span>Please connect your wallet to see your projects</span>
											)}
										</div>
									</div>
								</CardHeader>
								<CardContent>
									{connected && account ? (
										<>
											<div className="mb-4 text-sm text-muted-foreground">
												{(() => {
													const mine = (contractData?.projectEscrows || []).filter(p => p.owner.toLowerCase() === account.address.toString().toLowerCase())
													const total = mine.reduce((s, p) => s + (p.balance || 0), 0)
													return (
														<div className="flex gap-6 flex-wrap">
															<div>
																<span className="font-medium">Projects:</span> {mine.length}
															</div>
															<div>
																<span className="font-medium">Total Remaining:</span> {projectEscrowUtils.formatApt(total)}
															</div>
														</div>
													)
												})()}
											</div>

									<Table>
										<TableHeader>
											<TableRow>
													<TableHead>ID</TableHead>
													<TableHead>Name</TableHead>
													<TableHead>Owner</TableHead>
													<TableHead>Remaining</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
												{(contractData?.projectEscrows || [])
													.filter(p => p.owner.toLowerCase() === account.address.toString().toLowerCase())
													.map((p) => (
														<TableRow key={p.projectId}>
															<TableCell className="font-mono">{p.projectId}</TableCell>
															<TableCell className="font-medium">{p.projectName}</TableCell>
															<TableCell className="font-mono text-xs">{p.owner.slice(0,6)}...{p.owner.slice(-4)}</TableCell>
															<TableCell>{projectEscrowUtils.formatApt(p.balance || 0)}</TableCell>
												<TableCell>
																<span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">{p.status}</span>
												</TableCell>
												<TableCell>
																<Button variant="secondary" size="sm" onClick={() => { setFundProject(p); setFundAmount(""); setFundOpen(true); }}>
																	Add Funds
																</Button>
															</TableCell>
											</TableRow>
													))}
												{(contractData?.projectEscrows || []).filter(p => p.owner.toLowerCase() === (account?.address?.toString() || '').toLowerCase()).length === 0 && (
											<TableRow>
														<TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No projects found for your wallet.</TableCell>
											</TableRow>
												)}
										</TableBody>
									</Table>
									</>
									) : (
										<div className="flex items-center justify-between">
											<p className="text-sm">Connect your wallet to view and manage your on-chain projects.</p>
											<div>
												{/* Placeholder for wallet connect UI in header area */}
												<Wallet className="h-5 w-5 text-muted-foreground" />
											</div>
										</div>
									)}
								</CardContent>
							</Card>

							<Dialog open={fundOpen} onOpenChange={setFundOpen}>
								<DialogContent className="sm:max-w-[420px]">
									<DialogHeader>
										<DialogTitle>Add Funds</DialogTitle>
									</DialogHeader>
									<form onSubmit={handleFundSubmit} className="space-y-4">
										<div className="text-sm text-muted-foreground">
											Project ID: <span className="font-mono">{fundProject?.projectId}</span>
										</div>
										<div className="grid gap-2">
											<label className="text-sm font-medium">Amount (APT)</label>
											<Input type="number" min="0.00000001" step="0.00000001" placeholder="1.0" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} required />
											{fundError && (<div className="text-xs text-red-600">{fundError}</div>)}
										</div>
										<DialogFooter>
											<Button type="button" variant="secondary" onClick={() => setFundOpen(false)} disabled={funding}>Cancel</Button>
											<Button type="submit" disabled={funding || !connected || !account}>
												{funding ? (<span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Funding…</span>) : ("Add Funds")}
											</Button>
										</DialogFooter>
									</form>
								</DialogContent>
							</Dialog>
						</div>
					</main>
				</div>
			</div>
		)
	}

	return null
}
