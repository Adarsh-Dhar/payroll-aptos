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
  honest_review?: HonestReview
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
        // Check if this is a spam PR error
        if (errorData.details && errorData.details.reason === 'Empty or worthless PR with no meaningful changes') {
          throw new Error(`🚫 SPAM DETECTED: ${errorData.details.message}`)
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.analysis) {
        // Normalize API analysis (supports LLM schema and local fallback schema)
        const a = data.analysis
        const isLLMSchema = a && a.metric_scores && a.metric_scores.execution && typeof a.final_score === 'number'

        const llmCategoryMap: Record<string, 'easy' | 'medium' | 'hard'> = {
          'low-impact': 'easy',
          'medium-impact': 'medium',
          'high-impact': 'hard',
        }

        const normalized: ContributionAnalysis = isLLMSchema ? {
          category: llmCategoryMap[(a.category || '').toLowerCase()] || 'medium',
          final_score: a.final_score,
          metric_scores: {
            code_size: a.metric_scores.execution.code_size,
            review_cycles: a.metric_scores.execution.review_cycles,
            review_time: a.metric_scores.execution.review_time,
            first_review_wait: a.metric_scores.execution.first_review_wait,
            review_depth: a.metric_scores.execution.review_depth,
            code_quality: a.metric_scores.execution.code_quality,
          },
          reasoning: a.reasoning || '',
          key_insights: {
            complexity_indicators: a.key_insights?.quality_summary || '',
            quality_indicators: a.key_insights?.impact_assessment || '',
            timeline_analysis: '',
            risk_assessment: a.key_insights?.risk_assessment || '',
          },
          honest_review: a.honest_review ? {
            overall_verdict: a.honest_review.overall_verdict || '',
            code_quality_roast: a.honest_review.code_quality_roast || '',
            architecture_opinion: a.honest_review.architecture_opinion || '',
            performance_concerns: a.honest_review.performance_concerns || '',
            security_red_flags: a.honest_review.security_red_flags || '',
            maintainability_rant: a.honest_review.maintainability_rant || '',
            what_they_did_right: a.honest_review.what_they_did_right || '',
            what_they_fucked_up: a.honest_review.what_they_fucked_up || '',
            final_verdict: a.honest_review.final_verdict || '',
            tone: a.honest_review.tone || 'neutral',
          } : undefined
        } : {
          category: a.category,
          final_score: a.final_score,
          metric_scores: a.metric_scores,
          reasoning: a.reasoning,
          key_insights: a.key_insights,
          honest_review: a.honest_review
        }

        setAnalysis(normalized)

        const score = normalized.final_score
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
        // Check if this is a spam PR error
        if (errorData.details && errorData.details.reason === 'Empty or worthless PR with no meaningful changes') {
          throw new Error(`🚫 SPAM DETECTED: ${errorData.details.message}`)
        }
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

              {/* Honest Review Section */}
              {analysis.honest_review && (
                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">🔥</span>
                      Brutally Honest Review
                      <Badge 
                        variant={
                          analysis.honest_review.tone === 'brutal' ? 'destructive' :
                          analysis.honest_review.tone === 'praising' ? 'default' :
                          analysis.honest_review.tone === 'impressed' ? 'default' :
                          analysis.honest_review.tone === 'disappointed' ? 'secondary' :
                          'outline'
                        }
                        className="text-sm"
                      >
                        {analysis.honest_review.tone.toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Overall Verdict */}
                    <div className="p-3 bg-white rounded-lg border-l-4 border-orange-500">
                      <div className="font-semibold text-orange-800 mb-1">Overall Verdict</div>
                      <div className="text-orange-700 font-medium">{analysis.honest_review.overall_verdict}</div>
                    </div>

                    {/* Code Quality Roast */}
                    <div className="p-3 bg-white rounded-lg">
                      <div className="font-semibold text-gray-800 mb-1">Code Quality Assessment</div>
                      <div className="text-gray-700">{analysis.honest_review.code_quality_roast}</div>
                    </div>

                    {/* Architecture Opinion */}
                    <div className="p-3 bg-white rounded-lg">
                      <div className="font-semibold text-gray-800 mb-1">Architecture Opinion</div>
                      <div className="text-gray-700">{analysis.honest_review.architecture_opinion}</div>
                    </div>

                    {/* Performance & Security */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="font-semibold text-gray-800 mb-1">Performance</div>
                        <div className="text-gray-700 text-sm">{analysis.honest_review.performance_concerns}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="font-semibold text-gray-800 mb-1">Security</div>
                        <div className="text-gray-700 text-sm">{analysis.honest_review.security_red_flags}</div>
                      </div>
                    </div>

                    {/* Maintainability */}
                    <div className="p-3 bg-white rounded-lg">
                      <div className="font-semibold text-gray-800 mb-1">Maintainability</div>
                      <div className="text-gray-700">{analysis.honest_review.maintainability_rant}</div>
                    </div>

                    {/* What They Did Right vs Wrong */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                        <div className="font-semibold text-green-800 mb-1">✅ What They Did Right</div>
                        <div className="text-green-700 text-sm">{analysis.honest_review.what_they_did_right}</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                        <div className="font-semibold text-red-800 mb-1">❌ What They Fucked Up</div>
                        <div className="text-red-700 text-sm">{analysis.honest_review.what_they_fucked_up}</div>
                      </div>
                    </div>

                    {/* Final Verdict */}
                    <div className="p-4 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg border-2 border-orange-300">
                      <div className="font-bold text-orange-900 mb-2">Final Verdict</div>
                      <div className="text-orange-800 font-medium">{analysis.honest_review.final_verdict}</div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
