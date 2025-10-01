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
  // no USD funding tracked
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
  githubToken: string
}

interface HonestReview {
  overall_verdict: string
  code_quality_roast: string
  architecture_opinion: string
  performance_concerns: string
  security_red_flags: string
  maintainability_rant: string
  what_they_did_right: string
  what_they_fucked_up: string
  final_verdict: string
  tone: 'brutal' | 'praising' | 'neutral' | 'disappointed' | 'impressed'
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
    honest_review?: HonestReview
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
    amount: "",
    githubToken: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [prValidation, setPrValidation] = useState<PRValidation | null>(null)
  const [validatingPr, setValidatingPr] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [calculatedBounty, setCalculatedBounty] = useState<number | null>(null)
  const [prScore, setPrScore] = useState<number | null>(null)
  const [bountyCalculation, setBountyCalculation] = useState<any>(null)
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null)
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [prClaimStatus, setPrClaimStatus] = useState<PRClaimStatus | null>(null)
  const [checkingClaimStatus, setCheckingClaimStatus] = useState(false)
  const [submittedPRs, setSubmittedPRs] = useState<Set<string>>(new Set())
  const [isClaimable, setIsClaimable] = useState(false)

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
          console.log('Project data loaded:', result.data)
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

  // Helpers
  const extractRepoFromUrl = (url: string): string | null => {
    const m = url.match(/github\.com\/([^\/]+)\/([^\/#?]+)/)
    if (!m) return null
    return `${m[1]}/${m[2]}`
  }

  const handleValidatePR = async () => {
    if (!project) return
    setValidationError(null)
    setValidatingPr(true)
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

      const res = await fetch(`${baseUrl}/api/v1/contributor/validate-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prUrl: formData.prUrl,
          githubToken,
          projectRepoUrl: project.repoUrl
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Validation failed')
      }
      setPrValidation(data)
      
      // Extract and store the PR score from the analysis
      if (data.analysis && data.analysis.final_score) {
        setPrScore(data.analysis.final_score)
        console.log('PR Score extracted:', data.analysis.final_score)
        console.log('Full analysis data:', data.analysis)
        console.log('Project bounty range:', { lowest: project.lowestBounty, highest: project.highestBounty })
      } else {
        console.log('No PR score found in validation response')
        console.log('Available data keys:', Object.keys(data))
        if (data.analysis) {
          console.log('Analysis object keys:', Object.keys(data.analysis))
        }
        setPrScore(null)
      }

      const repository = extractRepoFromUrl(project.repoUrl)
      const prNumber = Number(data.validation?.prNumber || data.validation?.pr_number)
      if (repository && prNumber) {
        const claimRes = await fetch(`${baseUrl}/api/v1/contributor/github-prs/claim-bounty`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prNumber, 
            repository, 
            projectId: project.id,
            githubToken: formData.githubToken
          })
        })
        const claimJson = await claimRes.json()
        console.log('Claim API response:', claimJson)
        console.log('Claim API response status:', claimRes.status)
        if (claimRes.ok && claimJson.success) {
          const calc = claimJson.data?.bountyCalculation?.calculatedBounty
          const bountyCalc = claimJson.data?.bountyCalculation
          console.log('✅ API call successful, using API bounty:', calc)
          console.log('✅ Bounty calculation data:', bountyCalc)
          if (typeof calc === 'number') setCalculatedBounty(calc)
          if (bountyCalc) setBountyCalculation(bountyCalc)
        } else {
          // Fallback calculation using the proper L + Dx/10 formula
          const L = project.lowestBounty
          const H = project.highestBounty
          const D = H - L
          const score = Number(data.analysis?.final_score || 8.0) // Default to 8.0 if no score
          const bounty = L + (D * score / 10)
          console.log('❌ Claim API failed, using fallback calculation')
          console.log('Fallback bounty calculation:', { L, H, D, score, bounty })
          console.log('API error:', claimJson)
          setCalculatedBounty(Number.isFinite(bounty) ? bounty : L)
        }
      }

      const statusRes = await fetch(`${baseUrl}/api/v1/contributor/pr-claim-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', prUrl: formData.prUrl, projectId: project.id })
      })
      const statusJson = await statusRes.json()
      if (statusRes.ok && statusJson.success) {
        setPrClaimStatus(statusJson)
        setIsClaimable(!statusJson.isClaimed)
      } else {
        setIsClaimable(false)
      }
    } catch (e: any) {
      setValidationError(e?.message || 'Failed to validate PR')
      setIsClaimable(false)
    } finally {
      setValidatingPr(false)
    }
  }

  const handleClaim = async () => {
    if (!project) return
    if (!connected || !account) {
      setWithdrawalError('Please connect your wallet to claim')
      return
    }
    if (!formData.prUrl) {
      setWithdrawalError('Please enter a valid PR URL')
      return
    }
    setWithdrawalError(null)
    setIsSubmitting(true)
    try {
      const withdrawRes = await projectEscrowClient.withdrawFromProjectWithWallet(
        account.address.toString(),
        signAndSubmitTransaction,
        Number(project.id),
        calculatedBounty || 0.01
      )

      if (!withdrawRes.success) {
        throw new Error(withdrawRes.error || 'Blockchain withdrawal failed')
      }

      setTransactionHash(withdrawRes.transactionHash || null)
      setWithdrawalSuccess(true)

      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const markRes = await fetch(`${baseUrl}/api/v1/contributor/pr-claim-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-claimed',
          prUrl: formData.prUrl,
          projectId: project.id,
          bountyAmount: calculatedBounty || 0
        })
      })
      const markJson = await markRes.json()
      if (!markRes.ok || !markJson.success) {
        throw new Error(markJson.message || 'Failed to record claim')
      }

      setSubmitted(true)
    } catch (e: any) {
      setWithdrawalError(e?.message || 'Failed to claim bounty')
    } finally {
      setIsSubmitting(false)
    }
  }

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
                    setPrScore(null);
                    setBountyCalculation(null);
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
                        ID: {project.id}
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
                      onChange={(e) => {
                        setGithubToken(e.target.value)
                        setFormData(prev => ({ ...prev, githubToken: e.target.value }))
                      }}
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
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleValidatePR} disabled={!githubToken || !formData.prUrl || validatingPr}>
                        {validatingPr ? (
                          <span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Validating…</span>
                        ) : (
                          'Validate PR'
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setPrValidation(null);
                        setCalculatedBounty(null);
                        setPrScore(null);
                        setBountyCalculation(null);
                        setPrClaimStatus(null);
                        setValidationError(null);
                        setIsClaimable(false);
                      }}>Reset</Button>
                    </div>
                    {validationError && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
                        <XCircle className="h-4 w-4 mt-0.5" />
                        <span>{validationError}</span>
                      </div>
                    )}
                    {prValidation && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                        <div className="font-medium mb-1">PR Validated</div>
                        <div>PR #{prValidation.validation.prNumber} • {prValidation.validation.prTitle}</div>
                        <div>Author: {prValidation.validation.prAuthor}</div>
                        {prScore !== null ? (
                          <div className="mt-2 pt-2 border-t border-blue-300">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span className="font-medium">Contribution Score: {prScore.toFixed(1)}/10</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 pt-2 border-t border-blue-300">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs">Score calculation in progress...</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Honest Review Section */}
                        {prValidation?.analysis?.honest_review && (
                          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xl">🔥</span>
                              <span className="font-semibold text-orange-800">Brutally Honest Review</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                prValidation.analysis.honest_review.tone === 'brutal' ? 'bg-red-100 text-red-800' :
                                prValidation.analysis.honest_review.tone === 'praising' ? 'bg-green-100 text-green-800' :
                                prValidation.analysis.honest_review.tone === 'impressed' ? 'bg-blue-100 text-blue-800' :
                                prValidation.analysis.honest_review.tone === 'disappointed' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {prValidation.analysis.honest_review.tone.toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="space-y-3 text-sm">
                              <div className="p-2 bg-white rounded border-l-4 border-orange-500">
                                <div className="font-medium text-orange-800 mb-1">Overall Verdict</div>
                                <div className="text-orange-700">{prValidation.analysis.honest_review.overall_verdict}</div>
                              </div>
                              
                              <div className="p-2 bg-white rounded">
                                <div className="font-medium text-gray-800 mb-1">Code Quality</div>
                                <div className="text-gray-700">{prValidation.analysis.honest_review.code_quality_roast}</div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="p-2 bg-green-50 rounded border-l-4 border-green-500">
                                  <div className="font-medium text-green-800 mb-1">✅ What's Good</div>
                                  <div className="text-green-700 text-xs">{prValidation.analysis.honest_review.what_they_did_right}</div>
                                </div>
                                <div className="p-2 bg-red-50 rounded border-l-4 border-red-500">
                                  <div className="font-medium text-red-800 mb-1">❌ What's Wrong</div>
                                  <div className="text-red-700 text-xs">{prValidation.analysis.honest_review.what_they_fucked_up}</div>
                                </div>
                              </div>
                              
                              <div className="p-3 bg-gradient-to-r from-orange-100 to-red-100 rounded border-2 border-orange-300">
                                <div className="font-bold text-orange-900 mb-1">Final Verdict</div>
                                <div className="text-orange-800 font-medium">{prValidation.analysis.honest_review.final_verdict}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {typeof calculatedBounty === 'number' && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                        <div className="font-medium mb-1">Estimated Bounty: ${calculatedBounty.toFixed(4)}</div>
                        {bountyCalculation ? (
                          <div className="text-xs text-green-700 mt-1">
                            <div>Formula: {bountyCalculation.formula}</div>
                            {bountyCalculation.stepByStep && (
                              <div className="mt-1 font-mono">{bountyCalculation.stepByStep}</div>
                            )}
                          </div>
                        ) : prScore !== null ? (
                          <div className="text-xs text-green-700 mt-1">
                            <div>Formula: L + (D × score / 10) = ${project.lowestBounty} + (${(project.highestBounty - project.lowestBounty).toFixed(2)} × {prScore.toFixed(1)} / 10)</div>
                            <div className="mt-1 font-mono">= ${project.lowestBounty} + ${((project.highestBounty - project.lowestBounty) * prScore / 10).toFixed(4)} = ${(project.lowestBounty + (project.highestBounty - project.lowestBounty) * prScore / 10).toFixed(4)}</div>
                          </div>
                        ) : null}
                      </div>
                    )}
                    {prClaimStatus && prClaimStatus.isClaimed && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        This PR is already claimed{prClaimStatus.claimedAmount ? ` ($${prClaimStatus.claimedAmount})` : ''}.
                      </div>
                    )}
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
                    disabled={!connected || !isClaimable || isSubmitting || !prValidation}
                    onClick={handleClaim}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Processing…</span>
                    ) : (
                      <span className="inline-flex items-center"><Wallet className="h-4 w-4 mr-2" />Claim Bounty</span>
                    )}
                  </Button>
                  {withdrawalError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
                      <XCircle className="h-4 w-4 mt-0.5" />
                      <span>{withdrawalError}</span>
                    </div>
                  )}
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
