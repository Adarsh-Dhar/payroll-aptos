"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { projectEscrowClient, projectEscrowUtils } from "@/lib/contract"
import { toast } from "sonner"
import { Loader2, Wallet, LogIn } from "lucide-react"
import { useSession, signIn } from "next-auth/react"

type CreateProjectFormState = {
	name: string
	description: string
	repoUrl: string
	initialFunding: string
	lowestBounty: string
	highestBounty: string
	fundingAmount: string
}

export function CreateProjectDialog() {
	const [open, setOpen] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [form, setForm] = useState<CreateProjectFormState>({
		name: "",
		description: "",
		repoUrl: "",
		initialFunding: "",
		lowestBounty: "",
		highestBounty: "",
		fundingAmount: "",
	})

	const { connected, account, signAndSubmitTransaction } = useWallet()
	const { data: session, status } = useSession()

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		
		if (!connected || !account) {
			toast.error("Please connect your wallet first")
			return
		}

		if (status === "loading") {
			toast.error("Please wait while we check your authentication status")
			return
		}

		if (!session) {
			toast.error("Please sign in with GitHub to create a project")
			return
		}

		setSubmitting(true)
		try {
			// Ensure contract is initialized (server uses deployer key)
			try {
				const initRes = await fetch('/api/v1/contract/initialize', { method: 'POST' })
				const data = await initRes.json().catch(() => ({}))
				if (!initRes.ok) {
					console.warn('Contract initialization failed', data)
					const extra = data?.details ? ` (details: ${JSON.stringify(data.details)})` : ''
					if (data?.message?.includes('Deployer private key address does not match')) {
						toast.error('Server initializer misconfigured: deployer key does not match contract address' + extra)
					} else if (data?.message) {
						toast.error(`Server initialization failed: ${data.message}` + extra)
					}
				} else if (data && data.initialized === false) {
					toast.error('Server tried to initialize but contract is still not ready')
				}
			} catch (e) {
				console.warn('Initialization request error', e)
			}

			// Step 1: Create project escrow on blockchain
			const fundingAmountOctas = projectEscrowUtils.aptToOctas(Number(form.fundingAmount))
			
			toast.info(`Creating project escrow on blockchain with ${form.fundingAmount} APT (${fundingAmountOctas} octas)...`)
			
			// Execute the real blockchain transaction using wallet adapter
			const blockchainResult = await projectEscrowClient.createAndFundProjectWithWallet(
				account.address.toString(),
				signAndSubmitTransaction,
				Number(form.fundingAmount)
			)

			if (!blockchainResult.success) {
				throw new Error(`Blockchain transaction failed: ${blockchainResult.error}`)
			}

			toast.success(`Project escrow created successfully on blockchain! Transaction: ${blockchainResult.transactionHash}`)

			// Step 2: Create project in database only after successful blockchain transaction
			const payload = {
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				repoUrl: form.repoUrl.trim(),
				initialFunding: Number(form.initialFunding),
				lowestBounty: Number(form.lowestBounty),
				highestBounty: Number(form.highestBounty),
			}

			toast.info("Creating project in database...")
			const res = await fetch("/api/v1/projects", {
				method: "POST",
				headers: { 
					"Content-Type": "application/json",
					"Cookie": document.cookie // Include session cookie for authentication
				},
				body: JSON.stringify(payload),
			})
			
			const data = await res.json()

			if (res.ok) {
				toast.success("Project created successfully!")
				setOpen(false)
				setForm({ 
					name: "", 
					description: "", 
					repoUrl: "", 
					initialFunding: "", 
					lowestBounty: "", 
					highestBounty: "", 
					fundingAmount: "" 
				})
			} else {
				// Handle specific error cases
				if (res.status === 401) {
					throw new Error("Authentication failed. Please sign in again.")
				} else if (res.status === 403) {
					throw new Error("You don't have permission to create projects.")
				} else if (res.status === 400) {
					throw new Error(data.message || "Invalid project data. Please check your inputs.")
				} else {
					// If database creation fails, we should ideally handle the blockchain escrow
					// For now, we'll just show an error and let the user know
					throw new Error(data.message || "Failed to create project in database. Blockchain escrow was created successfully.")
				}
			}
		} catch (err) {
			console.error("Create project error:", err)
			toast.error(err instanceof Error ? err.message : "Failed to create project")
		} finally {
			setSubmitting(false)
		}
	}

	if (status === "loading") {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button size="sm" className="h-9">Create Project</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[520px]">
					<DialogHeader>
						<DialogTitle>Loading...</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center justify-center py-8 space-y-4">
						<Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
						<div className="text-center">
							<h3 className="text-lg font-medium mb-2">Checking Authentication</h3>
							<p className="text-muted-foreground">
								Please wait while we verify your authentication status.
							</p>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		)
	}

	if (!connected || !session) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button size="sm" className="h-9">Create Project</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[520px]">
					<DialogHeader>
						<DialogTitle>Authentication Required</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center justify-center py-8 space-y-4">
						{!connected ? (
							<>
								<Wallet className="h-12 w-12 text-muted-foreground" />
								<div className="text-center">
									<h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
									<p className="text-muted-foreground">
										You need to connect your wallet to create a project and fund the escrow.
									</p>
								</div>
							</>
						) : (
							<>
								<LogIn className="h-12 w-12 text-muted-foreground" />
								<div className="text-center">
									<h3 className="text-lg font-medium mb-2">Sign In Required</h3>
									<p className="text-muted-foreground">
										You need to sign in with GitHub to create a project.
									</p>
								</div>
								<Button onClick={() => signIn("github")} className="w-full">
									<LogIn className="mr-2 h-4 w-4" />
									Sign in with GitHub
								</Button>
							</>
						)}
						<Button variant="outline" onClick={() => setOpen(false)}>
							Close
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="h-9">Create Project</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>Create a new project</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Wallet and Auth Info */}
					<div className="p-3 bg-muted/50 rounded-lg space-y-2">
						<div className="flex items-center gap-2 text-sm">
							<Wallet className="h-4 w-4 text-green-600" />
							<span className="text-muted-foreground">Wallet:</span>
							<span className="font-mono text-xs">
								{account?.address.toString().slice(0, 6)}...{account?.address.toString().slice(-4)}
							</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<LogIn className="h-4 w-4 text-green-600" />
							<span className="text-muted-foreground">Signed in as:</span>
							<span className="font-mono text-xs">
								{(session?.user as any)?.githubUsername || session?.user?.name}
							</span>
						</div>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							placeholder="Awesome OSS Project"
							value={form.name}
							onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="description">Description</Label>
						<Input
							id="description"
							placeholder="Short summary of the project"
							value={form.description}
							onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="repoUrl">Repository URL</Label>
						<Input
							id="repoUrl"
							placeholder="https://github.com/org/repo"
							type="url"
							value={form.repoUrl}
							onChange={(e) => setForm((s) => ({ ...s, repoUrl: e.target.value }))}
							required
						/>
					</div>
					{/* USD initial funding removed; only APT funding is required */}
					<div className="grid gap-2">
						<Label htmlFor="fundingAmount">Initial Funding Amount (APT)</Label>
						<Input
							id="fundingAmount"
							type="number"
							min="0.00000001"
							step="0.00000001"
							placeholder="10.0"
							value={form.fundingAmount}
							onChange={(e) => setForm((s) => ({ ...s, fundingAmount: e.target.value }))}
							required
						/>
						<p className="text-xs text-muted-foreground">
							This amount will be locked in the project escrow on the blockchain
						</p>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="lowestBounty">Lowest Bounty (USD)</Label>
							<Input
								id="lowestBounty"
								type="number"
								min="0"
								step="0.01"
								placeholder="100"
								value={form.lowestBounty}
								onChange={(e) => setForm((s) => ({ ...s, lowestBounty: e.target.value }))}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="highestBounty">Highest Bounty (USD)</Label>
							<Input
								id="highestBounty"
								type="number"
								min="0"
								step="0.01"
								placeholder="1000"
								value={form.highestBounty}
								onChange={(e) => setForm((s) => ({ ...s, highestBounty: e.target.value }))}
								required
							/>
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting}>
							{submitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : (
								"Create Project"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}


