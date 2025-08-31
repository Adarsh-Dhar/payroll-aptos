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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Wallet, CheckCircle, AlertCircle, Info } from "lucide-react"
import { projectEscrowClient, projectEscrowUtils } from "@/lib/contract"

type FundProjectFormState = {
	projectName: string
	description: string
	repoUrl: string
	budget: string
	lowestBounty: string
	highestBounty: string
	adminId: string
	contractAddress: string
}

type FundingStatus = 'idle' | 'validating' | 'funding' | 'success' | 'error'

export function FundProjectDialog() {
	const [open, setOpen] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [fundingStatus, setFundingStatus] = useState<FundingStatus>('idle')
	const [transactionHash, setTransactionHash] = useState<string>('')
	const [errorMessage, setErrorMessage] = useState<string>('')
	const [validationMessage, setValidationMessage] = useState<string>('')
	const [form, setForm] = useState<FundProjectFormState>({
		projectName: "",
		description: "",
		repoUrl: "",
		budget: "",
		lowestBounty: "",
		highestBounty: "",
		adminId: "",
		contractAddress: "",
	})

	const validateForm = (): { isValid: boolean; message: string } => {
		if (!form.contractAddress.trim()) {
			return { isValid: false, message: 'Contract address is required' }
		}

		if (!projectEscrowUtils.isValidAddress(form.contractAddress.trim())) {
			return { isValid: false, message: 'Invalid Aptos contract address format' }
		}

		if (!form.budget || Number(form.budget) <= 0) {
			return { isValid: false, message: 'Funding amount must be greater than 0' }
		}

		if (!form.projectName.trim()) {
			return { isValid: false, message: 'Project name is required' }
		}

		if (!form.repoUrl.trim()) {
			return { isValid: false, message: 'Repository URL is required' }
		}

		if (Number(form.lowestBounty) >= Number(form.highestBounty)) {
			return { isValid: false, message: 'Highest bounty must be greater than lowest bounty' }
		}

		return { isValid: true, message: '' }
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		
		// Validate form first
		const validation = validateForm()
		if (!validation.isValid) {
			setErrorMessage(validation.message)
			setFundingStatus('error')
			return
		}

		setSubmitting(true)
		setFundingStatus('validating')
		setErrorMessage('')

		try {
			// First, validate the contract
			setValidationMessage('Validating contract address...')
			
			const fundingStatus = await projectEscrowClient.getProjectFundingStatus(form.contractAddress.trim())
			
			if (!fundingStatus.isInitialized) {
				throw new Error('Contract vault is not initialized at the specified address')
			}

			setValidationMessage('Contract validated successfully!')
			setFundingStatus('funding')

			// Fund the contract
			const fundingResult = await projectEscrowClient.fundProject(
				'admin-wallet', // In real implementation, get from wallet connection
				form.contractAddress.trim(),
				Number(form.budget)
			)

			if (!fundingResult.success) {
				throw new Error(fundingResult.error || 'Funding failed')
			}

			setTransactionHash(fundingResult.transactionHash || '')
			setFundingStatus('success')
			
			// After successful funding, create the project in the database
			const projectPayload = {
				name: form.projectName.trim(),
				description: form.description.trim() || undefined,
				repoUrl: form.repoUrl.trim(),
				budget: Number(form.budget),
				lowestBounty: Number(form.lowestBounty),
				highestBounty: Number(form.highestBounty),
				adminId: Number(form.adminId),
			}

			const res = await fetch("/api/v1/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(projectPayload),
			})

			if (!res.ok) {
				throw new Error('Failed to create project in database')
			}

			// Reset form after successful creation
			setTimeout(() => {
				setOpen(false)
				setForm({ 
					projectName: "", 
					description: "", 
					repoUrl: "", 
					budget: "", 
					lowestBounty: "", 
					highestBounty: "", 
					adminId: "",
					contractAddress: ""
				})
				setFundingStatus('idle')
				setTransactionHash('')
				setValidationMessage('')
			}, 3000)

		} catch (err) {
			console.error("Project funding error:", err)
			setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
			setFundingStatus('error')
		} finally {
			setSubmitting(false)
		}
	}

	const renderStatusContent = () => {
		switch (fundingStatus) {
			case 'validating':
				return (
					<Alert>
						<Info className="h-4 w-4" />
						<AlertDescription>
							{validationMessage}
						</AlertDescription>
					</Alert>
				)
			case 'funding':
				return (
					<Alert>
						<Loader2 className="h-4 w-4 animate-spin" />
						<AlertDescription>
							Funding contract with {form.budget} APT... This may take a few moments.
						</AlertDescription>
					</Alert>
				)
			case 'success':
				return (
					<Alert className="border-green-200 bg-green-50">
						<CheckCircle className="h-4 w-4 text-green-600" />
						<AlertDescription className="text-green-800">
							Contract funded successfully! Transaction: {vaultUtils.formatAddress(transactionHash)}
						</AlertDescription>
					</Alert>
				)
			case 'error':
				return (
					<Alert className="border-red-200 bg-red-50">
						<AlertCircle className="h-4 w-4 text-red-600" />
						<AlertDescription className="text-red-800">
							{errorMessage || 'An error occurred during funding'}
						</AlertDescription>
					</Alert>
				)
			default:
				return null
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="h-9 bg-green-600 hover:bg-green-700">
					<Wallet className="h-4 w-4 mr-2" />
					Fund & Create Project
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Fund Contract & Create Project</DialogTitle>
				</DialogHeader>
				
				{renderStatusContent()}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-2">
						<Label htmlFor="projectName">Project Name</Label>
						<Input
							id="projectName"
							placeholder="Awesome OSS Project"
							value={form.projectName}
							onChange={(e) => setForm((s) => ({ ...s, projectName: e.target.value }))}
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

					<div className="grid gap-2">
						<Label htmlFor="contractAddress">Contract Address</Label>
						<Input
							id="contractAddress"
							placeholder="0x..."
							value={form.contractAddress}
							onChange={(e) => setForm((s) => ({ ...s, contractAddress: e.target.value }))}
							required
						/>
						<p className="text-xs text-muted-foreground">
							The Aptos contract address where the vault is deployed
						</p>
					</div>
					
					<div className="grid gap-2">
						<Label htmlFor="budget">Funding Amount (APT)</Label>
						<Input
							id="budget"
							type="number"
							min="0"
							step="0.01"
							placeholder="10.0"
							value={form.budget}
							onChange={(e) => setForm((s) => ({ ...s, budget: e.target.value }))}
							required
						/>
						<p className="text-xs text-muted-foreground">
							Amount to fund the contract vault
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
					
					<div className="grid gap-2">
						<Label htmlFor="adminId">Admin ID</Label>
						<Input
							id="adminId"
							type="number"
							min="1"
							placeholder="1"
							value={form.adminId}
							onChange={(e) => setForm((s) => ({ ...s, adminId: e.target.value }))}
							required
						/>
					</div>

					{/* Funding Summary Card */}
					<Card className="border-blue-200 bg-blue-50">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm text-blue-800">Funding Summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>Amount to Fund:</span>
								<Badge variant="secondary">{form.budget || '0'} APT</Badge>
							</div>
							<div className="flex justify-between text-sm">
								<span>In Octas:</span>
								<Badge variant="outline">
									{form.budget ? vaultUtils.aptToOctas(Number(form.budget)).toLocaleString() : '0'} octas
								</Badge>
							</div>
							<div className="flex justify-between text-sm">
								<span>Project Budget:</span>
								<Badge variant="outline">${form.budget || '0'}</Badge>
							</div>
							{form.contractAddress && (
								<div className="flex justify-between text-sm">
									<span>Contract:</span>
									<Badge variant="outline" className="font-mono">
										{vaultUtils.formatAddress(form.contractAddress)}
									</Badge>
								</div>
							)}
						</CardContent>
					</Card>

					<DialogFooter>
						<Button 
							type="button" 
							variant="secondary" 
							onClick={() => setOpen(false)} 
							disabled={submitting}
						>
							Cancel
						</Button>
						<Button 
							type="submit" 
							disabled={submitting || fundingStatus === 'success'}
							className="bg-green-600 hover:bg-green-700"
						>
							{submitting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									{fundingStatus === 'validating' ? 'Validating...' : 
									 fundingStatus === 'funding' ? 'Funding...' : 'Creating...'}
								</>
							) : (
								'Fund & Create Project'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
