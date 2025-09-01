"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DollarSign, ArrowLeft, CheckCircle, AlertCircle, Loader2, Wallet, XCircle, Shield } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { projectEscrowClient } from "@/lib/contract"
import { useSession, signIn } from "next-auth/react"

interface Project {
  id: number
  name: string
  description: string | null
  repoUrl: string
  budget: number
  isActive: boolean
  maxContributors: number | null
  tags: string[]
  createdAt: string
  updatedAt: string
  highestBounty: number
  lowestBounty: number
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

interface ClaimFormData {
  projectId: string
  prNumber: string
  prUrl: string
  description: string
  amount: string
}

interface PRValidation {
  validation: {
    prNumber: number
    prTitle: string
    prAuthor: string
  }
  metadata: {
    pr_repository: string
  }
  analysis: {
    final_score: number
    category: string
    metric_scores: {
      code_size: number
      review_cycles: number
      review_time: number
      first_review_wait: number
      review_depth: number
      code_quality: number
    }
    reasoning: string
  }
}

interface PRClaimStatus {
  isClaimed: boolean
  claimedBy?: string
  claimedAt?: string
  claimedAmount?: number
  message?: string
}

export default function ClaimPage() {
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
  const params = useParams()
  const projectId = params.projectId as string
  const { data: session, status } = useSession()
  const { connected, account, signAndSubmitTransaction } = useWallet()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [githubToken, setGithubToken] = useState("")
  const [formData, setFormData] = useState<ClaimFormData>({
    projectId: "",
    prNumber: "",
    prUrl: "",
    description: "",
    amount: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [prValidation, setPrValidation] = useState<PRValidation | null>(null)
  const [validatingPr, setValidatingPr] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [calculatedBounty, setCalculatedBounty] = useState<number | null>(null)
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null)
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [prClaimStatus, setPrClaimStatus] = useState<PRClaimStatus | null>(null)
  const [checkingClaimStatus, setCheckingClaimStatus] = useState(false)
  const [submittedPRs, setSubmittedPRs] = useState<Set<string>>(new Set())

  // useEffect hooks must be called before any conditional returns
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("github")
    }
  }, [status])

  useEffect(() => {
    async function fetchProjectDetails() {
      if (!projectId || status !== "authenticated") return
      
      try {
        setLoading(true)
        setError(null)
        
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        
        const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}`, {
          cache: 'no-store',
        })
        
        if (!response.ok) {
          setError(`API Error: ${response.status} ${response.statusText}`)
          return
        }
        
        const result = await response.json()
        if (result.success) {
          setProject(result.data)
          setFormData(prev => ({ ...prev, projectId: projectId.toString() }))
        } else {
          setError(result.message || 'Failed to fetch project details')
        }
      } catch (error) {
        setError('Failed to fetch project details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProjectDetails()
  }, [projectId, status])

  // NOW ALL HOOKS HAVE BEEN CALLED, WE CAN HAVE CONDITIONAL RENDERING
  // Render loading state for authentication
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

  // Render sign in prompt if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-32 w-32 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to sign in with GitHub to submit bounty claims.
          </p>
          <Button onClick={() => signIn("github")} size="lg">
            Sign in with GitHub
          </Button>
        </div>
      </div>
    )
  }

  // Render loading state for project
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
                <h2 className="text-lg font-semibold mb-2">Loading Project Details...</h2>
                <p className="text-muted-foreground">Please wait while we fetch the project information.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Render error state
  if (error || !project) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Project</h2>
                <p className="text-muted-foreground">{error || 'Unable to fetch project details. Please try refreshing the page.'}</p>
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

  // Render success state
  if (submitted) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-semibold mb-4">Bounty Claim Successful!</h1>
                <p className="text-muted-foreground mb-6">
                  Your bounty of <strong>${calculatedBounty?.toLocaleString()}</strong> has been successfully withdrawn from the blockchain.
                </p>
                
                {transactionHash && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="font-medium text-green-900 mb-2">Transaction Details</h3>
                    <div className="text-sm text-green-800">
                      <div className="font-mono bg-white p-2 rounded border">
                        {transactionHash}
                      </div>
                      <p className="mt-2 text-xs text-green-600">
                        You can view this transaction on the Aptos blockchain explorer
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/contributor/dashboard">
                      Back to Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setSubmitted(false);
                    setTransactionHash(null);
                    setWithdrawalSuccess(false);
                    setPrClaimStatus(null);
                    setPrValidation(null);
                    setCalculatedBounty(null);
                    setValidationError(null);
                    setWithdrawalError(null);
                    setSubmittedPRs(new Set());
                  }}>
                    Submit Another Claim
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Main form render
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl">
        <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Button variant="ghost" asChild className="mb-4 p-0 h-auto">
                <Link href="/contributor/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="text-3xl font-bold mb-2">Claim Your Bounty</h1>
              <p className="text-muted-foreground">
                Validate your merged pull request and submit your contribution reward claim for <strong>{project.name}</strong>.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Bounty Claim Form
                </CardTitle>
                <p className="text-sm text-muted-foreground font-normal">
                  Complete the form below after validating your pull request
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project</label>
                    <div className="p-3 bg-muted rounded-md border">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Budget: ${project.budget.toLocaleString()} • ID: {project.id}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Bounty Range: ${project.lowestBounty.toLocaleString()} - ${project.highestBounty.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">GitHub Personal Access Token</label>
                    <Input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Your GitHub personal access token is required to validate PR ownership and access repository information.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pull Request URL</label>
                    <Input
                      placeholder="https://github.com/username/repo/pull/123"
                      value={formData.prUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, prUrl: e.target.value }))}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the full GitHub PR URL to validate your contribution.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Wallet Status</label>
                    {connected && account ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            Wallet Connected: {account.address.toString().slice(0, 6)}...{account.address.toString().slice(-4)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-700">
                            Please connect your wallet to submit the bounty claim
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={!connected}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet to Claim
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Questions about your claim? Contact project administrators or check the project documentation.</p>
              <p className="mt-2">The PR validation process ensures fair bounty distribution based on contribution quality and complexity.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
