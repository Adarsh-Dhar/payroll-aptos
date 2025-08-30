"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DollarSign, Star, GitPullRequest, AlertCircle, CheckCircle, Loader2 } from "lucide-react"

interface ClaimRewardDialogProps {
  isOpen: boolean
  onClose: () => void
  onBountyClaimed?: (prNumber: number, bountyAmount: number) => void
  pr: {
    id: number
    prNumber: number
    title: string
    repository: string
    additions: number
    deletions: number
    hasTests: boolean
    description: string
    commits: any[]
    linkedIssue: string
    Project: {
      id: number
      name: string
      repoUrl: string
      lowestBounty: number
      highestBounty: number
    }
  }
}

interface ContributionAnalysis {
  category: 'easy' | 'medium' | 'hard'
  final_score: number
  metric_scores: {
    code_size: number
    review_cycles: number
    review_time: number
    first_review_wait: number
    review_depth: number
    code_quality: number
  }
  reasoning: string
  key_insights: {
    complexity_indicators: string
    quality_indicators: string
    timeline_analysis: string
    risk_assessment: string
  }
}

export default function ClaimRewardDialog({ isOpen, onClose, onBountyClaimed, pr }: ClaimRewardDialogProps) {
  const [githubToken, setGithubToken] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ContributionAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bountyAmount, setBountyAmount] = useState<number | null>(null)

  const handleAnalyze = async () => {
    if (!githubToken.trim()) {
      setError("Please enter a GitHub token")
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setAnalysis(null)
    setBountyAmount(null)

    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

      const response = await fetch(`${baseUrl}/api/agents/github/contribution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prUrl: `https://github.com/${pr.repository}/pull/${pr.prNumber}`,
          repoUrl: pr.Project.repoUrl,
          githubToken: githubToken
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.analysis) {
        setAnalysis(data.analysis)
        
        const score = data.analysis.final_score
        const lowestBounty = pr.Project.lowestBounty || 100
        const highestBounty = pr.Project.highestBounty || 1000
        
        const difference = highestBounty - lowestBounty
        const calculatedBounty = lowestBounty + (difference * score / 10)
        setBountyAmount(Math.round(calculatedBounty))
      } else {
        throw new Error(data.error || 'Failed to analyze PR')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error occurred"
      setError(msg)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleClaimBounty = async () => {
    if (!bountyAmount || !analysis) return

    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

      // Debug: Log what we're sending
      const requestBody = {
        prNumber: pr.prNumber,
        repository: pr.repository, // Use the repository field directly
        additions: pr.additions,
        deletions: pr.deletions,
        hasTests: pr.hasTests,
        description: pr.description,
        commits: pr.commits || [],
        githubUrl: pr.linkedIssue,
        bountyAmount: bountyAmount // Pass the calculated bounty amount
      }
      
      console.log('Sending to claim-bounty API:', requestBody)
      console.log('PR object:', pr)
      
      // First, call the claim bounty API to get the bounty amount
      const claimResponse = await fetch(`${baseUrl}/api/v1/contributor/github-prs/claim-bounty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!claimResponse.ok) {
        const errorData = await claimResponse.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${claimResponse.status}: ${claimResponse.statusText}`)
      }

      const claimResult = await claimResponse.json()
      
      if (claimResult.success) {
        // Now mark the PR as claimed in the database
        const markClaimedResponse = await fetch(`${baseUrl}/api/v1/contributor/github-prs/mark-claimed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prNumber: pr.prNumber,
            repository: pr.repository, // Use the repository field directly
            bountyAmount: bountyAmount,
            projectId: pr.Project.id
          })
        })

        if (!markClaimedResponse.ok) {
          const markErrorData = await markClaimedResponse.json().catch(() => ({}))
          console.warn('Failed to mark PR as claimed:', markErrorData.message)
          // Don't throw error here as the bounty was already claimed
        } else {
          console.log('PR marked as claimed successfully')
        }

        alert(`Bounty claimed successfully! Amount: $${claimResult.data.bountyAmount}`)
        onClose()
        // Trigger a callback to refresh the PR data instead of reloading the page
        if (onBountyClaimed) {
          onBountyClaimed(pr.prNumber, bountyAmount)
        }
      } else {
        throw new Error(claimResult.message || 'Failed to claim bounty')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error occurred"
      setError(msg)
    }
  }

  const resetForm = () => {
    setGithubToken("")
    setAnalysis(null)
    setError(null)
    setBountyAmount(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Claim Reward for PR #{pr.prNumber}
          </DialogTitle>
          <DialogDescription>
            Enter your GitHub token to analyze this PR and calculate your bounty reward.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{pr.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitPullRequest className="h-4 w-4" />
                <span>Repository: {pr.repository}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Additions:</span>
                  <span className="ml-2 font-medium text-green-600">+{pr.additions}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Deletions:</span>
                  <span className="ml-2 font-medium text-red-600">-{pr.deletions}</span>
                </div>
              </div>
              {pr.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {pr.description}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Label htmlFor="github-token">GitHub Personal Access Token</Label>
            <Input
              id="github-token"
              type="password"
              placeholder="ghp_..."
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              disabled={isAnalyzing}
            />
            <p className="text-xs text-muted-foreground">
              Token must have permissions to read PRs on the repository. 
              We'll use it to analyze your contribution and calculate the bounty.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <Button
              onClick={handleAnalyze}
              disabled={!githubToken.trim() || isAnalyzing}
              className="w-full max-w-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing PR...
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Analyze & Calculate Bounty
                </>
              )}
            </Button>
          </div>

          {isAnalyzing && (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing your PR contribution...
                </p>
              </div>
              
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {analysis && bountyAmount && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  PR analysis completed successfully! Your contribution score has been calculated.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Contribution Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {analysis.final_score}/10
                      </div>
                      <div className="text-sm text-muted-foreground">Final Score</div>
                    </div>
                    <Badge 
                      variant={analysis.category === 'easy' ? 'default' : analysis.category === 'medium' ? 'secondary' : 'destructive'}
                      className="text-lg px-4 py-2"
                    >
                      {analysis.category.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Code Size</div>
                      <div className="text-lg font-semibold">{analysis.metric_scores.code_size}/10</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Review Cycles</div>
                      <div className="text-lg font-semibold">{analysis.metric_scores.review_cycles}/10</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Review Time</div>
                      <div className="text-lg font-semibold">{analysis.metric_scores.review_time}/10</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Code Quality</div>
                      <div className="text-lg font-semibold">{analysis.metric_scores.code_quality}/10</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Analysis Summary</div>
                    <p className="text-sm leading-relaxed">{analysis.reasoning}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                    <DollarSign className="h-5 w-5" />
                    Bounty Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Project Bounty Range:</span>
                    <span className="font-medium">
                      ${pr.Project.lowestBounty.toLocaleString()} - ${pr.Project.highestBounty.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your Contribution Score:</span>
                    <span className="font-medium">{analysis.final_score}/10</span>
                  </div>
                  <div className="pt-2 border-t border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-green-800">Your Bounty:</span>
                      <span className="text-3xl font-bold text-green-700">
                        ${bountyAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button
                  onClick={handleClaimBounty}
                  className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Claim ${bountyAmount.toLocaleString()} Bounty
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
