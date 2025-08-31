"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, TestTube, CheckCircle, AlertCircle } from "lucide-react"
import { projectEscrowUtils } from "@/lib/contract"

export function ContractTestPanel() {
	const [contractAddress, setContractAddress] = useState("")
	const [amount, setAmount] = useState("")
	const [loading, setLoading] = useState(false)
	const [result, setResult] = useState<any>(null)
	const [error, setError] = useState<string>("")

	const testContractStatus = async () => {
		if (!contractAddress.trim()) {
			setError("Please enter a contract address")
			return
		}

		setLoading(true)
		setError("")
		setResult(null)

		try {
			const response = await fetch(`/api/v1/contract/test-funding?address=${encodeURIComponent(contractAddress.trim())}`)
			const data = await response.json()

			if (data.success) {
				setResult(data.data)
			} else {
				setError(data.message || "Failed to check contract status")
			}
		} catch (err) {
			setError("Failed to test contract")
		} finally {
			setLoading(false)
		}
	}

	const testContractFunding = async () => {
		if (!contractAddress.trim() || !amount) {
			setError("Please enter both contract address and amount")
			return
		}

		setLoading(true)
		setError("")
		setResult(null)

		try {
			const response = await fetch("/api/v1/contract/test-funding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contractAddress: contractAddress.trim(),
					amountInApt: Number(amount)
				})
			})

			const data = await response.json()

			if (data.success) {
				setResult(data.data)
			} else {
				setError(data.message || "Failed to test contract funding")
			}
		} catch (err) {
			setError("Failed to test contract funding")
		} finally {
			setLoading(false)
		}
	}

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<TestTube className="h-5 w-5" />
					Contract Test Panel
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-2">
					<Label htmlFor="contractAddress">Contract Address</Label>
					<Input
						id="contractAddress"
						placeholder="0x..."
						value={contractAddress}
						onChange={(e) => setContractAddress(e.target.value)}
					/>
				</div>

				<div className="grid gap-2">
					<Label htmlFor="amount">Amount (APT)</Label>
					<Input
						id="amount"
						type="number"
						min="0"
						step="0.01"
						placeholder="10.0"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</div>

				<div className="flex gap-2">
					<Button 
						onClick={testContractStatus} 
						disabled={loading || !contractAddress.trim()}
						variant="outline"
					>
						{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
						Check Status
					</Button>
					<Button 
						onClick={testContractFunding} 
						disabled={loading || !contractAddress.trim() || !amount}
						className="bg-blue-600 hover:bg-blue-700"
					>
						{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
						Test Funding
					</Button>
				</div>

				{error && (
					<Alert className="border-red-200 bg-red-50">
						<AlertCircle className="h-4 w-4 text-red-600" />
						<AlertDescription className="text-red-800">
							{error}
						</AlertDescription>
					</Alert>
				)}

				{result && (
					<Alert className="border-green-200 bg-green-50">
						<CheckCircle className="h-4 w-4 text-green-600" />
						<AlertDescription className="text-green-800">
							<div className="space-y-2">
								<div className="font-semibold">Test Results:</div>
								<div className="grid grid-cols-2 gap-2 text-sm">
									<span>Contract:</span>
									<Badge variant="outline" className="font-mono">
										{projectEscrowUtils.formatAddress(result.contractAddress)}
									</Badge>
								</div>
								{result.amountInApt && (
									<>
										<div className="grid grid-cols-2 gap-2 text-sm">
											<span>Amount:</span>
											<Badge variant="secondary">{result.amountInApt} APT</Badge>
										</div>
										<div className="grid grid-cols-2 gap-2 text-sm">
											<span>In Octas:</span>
											<Badge variant="outline">
												{result.amountInOctas?.toLocaleString() || 'N/A'}
											</Badge>
										</div>
									</>
								)}
								{result.transactionHash && (
									<div className="grid grid-cols-2 gap-2 text-sm">
										<span>Transaction:</span>
										<Badge variant="outline" className="font-mono">
											{projectEscrowUtils.formatAddress(result.transactionHash)}
										</Badge>
									</div>
								)}
								{result.fundingStatus && (
									<div className="grid grid-cols-2 gap-2 text-sm">
										<span>Initialized:</span>
										<Badge variant={result.fundingStatus.isInitialized ? "default" : "destructive"}>
											{result.fundingStatus.isInitialized ? "Yes" : "No"}
										</Badge>
									</div>
								)}
							</div>
						</AlertDescription>
					</Alert>
				)}

				<div className="text-xs text-muted-foreground">
					<p>This panel allows you to test the contract integration without actually funding projects.</p>
					<p>Use it to verify contract addresses and test the funding flow.</p>
				</div>
			</CardContent>
		</Card>
	)
}
