"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, AlertCircle, XCircle, Shield, Github, ExternalLink, Flame, AlertTriangle, ThumbsDown, ThumbsUp } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSession, signIn } from "next-auth/react"

interface Project {
  id: number
  name: string
  description: string | null
  repoUrl: string
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

export default function PRValidationPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { status } = useSession()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prValidation, setPrValidation] = useState<PRValidation | null>(null)

  // Mock data for demonstration - replace with actual API call
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
        } else {
          setError(result.message || 'Failed to fetch project details')
        }
      } catch {
        setError('Failed to fetch project details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProjectDetails()
  }, [projectId, status])

  // Mock PR validation data - replace with actual data
  useEffect(() => {
    if (project) {
      setPrValidation({
        validation: {
          prNumber: 3,
          prTitle: "Build",
          prAuthor: "Adarsh-Dhar"
        },
        metadata: {
          pr_repository: "devpaystream/contract"
        },
        analysis: {
          final_score: 2.6,
          category: "Build",
          metric_scores: {
            code_size: 3.2,
            review_cycles: 1.0,
            review_time: 0.5,
            first_review_wait: 0.1,
            review_depth: 1.0,
            code_quality: 2.0
          },
          reasoning: "Critical smart contract changes with zero regard for process, quality, or security",
          honest_review: {
            overall_verdict: "This is an absolute fucking disaster. You've introduced critical smart contract changes with zero regard for process, quality, or security.",
            code_quality_roast: "Code quality? What code quality? You've added a `flash-loans` program and gutted existing logic (`src/lib.rs`, removing `errors.rs` entirely, are you *kidding me*?) without a single goddamn test. Not one. For smart contracts! This isn't building; this is playing Russian roulette with the protocol's entire future. No CI, no linting, no static analysis? Are you operating out of a basement in the dark?",
            architecture_opinion: "You managed to push some Rust code to GitHub and it 'built' (according to your commit messages). That's about the only thing that technically 'worked' here. And even that is questionable given the utter lack of validation.",
            performance_concerns: "Everything. You fucked up the process. You fucked up the quality. You fucked up the security. You fucked up the maintainability. You merged a huge, critical change to smart contract code in 11 seconds with zero review, zero tests, zero CI.",
            security_red_flags: "This isn't how you build software, especially not blockchain. This is how you commit career suicide and potentially bankrupt a project. You need to pull this back, immediately, and understand what 'software engineering' actually means.",
            maintainability_rant: "REVERT THIS IMMEDIATELY. This PR should never have seen the light of day, let alone been merged. The author needs a mandatory re-education on secure software development, especially for critical systems like blockchain.",
            what_they_did_right: "You managed to push some Rust code to GitHub and it 'built' (according to your commit messages). That's about the only thing that technically 'worked' here. And even that is questionable given the utter lack of validation.",
            what_they_fucked_up: "Everything. You fucked up the process. You fucked up the quality. You fucked up the security. You fucked up the maintainability. You merged a huge, critical change to smart contract code in 11 seconds with zero review, zero tests, zero CI. This isn't how you build software, especially not blockchain. This is how you commit career suicide and potentially bankrupt a project. You need to pull this back, immediately, and understand what 'software engineering' actually means.",
            final_verdict: "REVERT THIS IMMEDIATELY. This PR should never have seen the light of day, let alone been merged. The author needs a mandatory re-education on secure software development, especially for critical systems like blockchain. This is not a contribution; it's a liability. Learn to write tests. Learn to get reviews. Learn to use CI. This is not a game.",
            tone: 'brutal'
          }
        }
      })
    }
  }, [project])

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
            You need to sign in with GitHub to view PR validations.
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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

  if (!prValidation) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-7xl">
          <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">No PR Validation Data</h2>
                <p className="text-muted-foreground">Unable to load PR validation information.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400"
    if (score >= 6) return "text-yellow-400"
    if (score >= 4) return "text-orange-400"
    return "text-red-400"
  }

  // const getScoreBgColor = (score: number) => {
  //   if (score >= 8) return "bg-green-900/20"
  //   if (score >= 6) return "bg-yellow-900/20"
  //   if (score >= 4) return "bg-orange-900/20"
  //   return "bg-red-900/20"
  // }

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'brutal': return 'bg-red-900/30 text-red-300 border-red-500/50'
      case 'praising': return 'bg-green-900/30 text-green-300 border-green-500/50'
      case 'impressed': return 'bg-blue-900/30 text-blue-300 border-blue-500/50'
      case 'disappointed': return 'bg-yellow-900/30 text-yellow-300 border-yellow-500/50'
      default: return 'bg-gray-900/30 text-gray-300 border-gray-500/50'
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl">
        <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button variant="ghost" asChild className="mb-4 p-0 h-auto">
                <Link href={`/contributor/dashboard/${projectId}/claim`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Claim Form
                </Link>
              </Button>
              <h1 className="text-3xl font-bold mb-2">PR Validation Results</h1>
              <p className="text-muted-foreground">
                Detailed analysis and brutally honest review for <strong>{project.name}</strong>
              </p>
            </div>

            {/* PR Info Card */}
            <Card className="mb-6 bg-card/50 border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Github className="h-5 w-5 text-blue-400" />
                    PR #{prValidation.validation.prNumber} • {prValidation.validation.prTitle}
                  </CardTitle>
                  <Badge variant="outline" className="flex items-center gap-1 border-border text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    {prValidation.metadata.pr_repository}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Author: <span className="font-medium text-foreground">{prValidation.validation.prAuthor}</span>
                </p>
              </CardHeader>
            </Card>

            {/* Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${getScoreColor(prValidation.analysis.final_score)}`}>
                      {prValidation.analysis.final_score.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">Contribution Score</div>
                    <Progress 
                      value={prValidation.analysis.final_score * 10} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground mt-2">out of 10</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2 text-blue-400">
                      {prValidation.analysis.category}
                    </div>
                    <div className="text-sm text-muted-foreground">Category</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-2 ${getScoreColor(prValidation.analysis.final_score)}`}>
                      {prValidation.analysis.final_score >= 8 ? 'Excellent' : 
                       prValidation.analysis.final_score >= 6 ? 'Good' : 
                       prValidation.analysis.final_score >= 4 ? 'Needs Work' : 'Poor'}
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Rating</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metric Scores */}
            <Card className="mb-8 bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Shield className="h-5 w-5 text-blue-400" />
                  Detailed Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(prValidation.analysis.metric_scores).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-foreground">{key.replace('_', ' ')}</span>
                        <span className={`font-medium ${getScoreColor(value)}`}>
                          {value.toFixed(1)}
                        </span>
                      </div>
                      <Progress value={value * 10} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Brutally Honest Review */}
            {prValidation.analysis.honest_review && (
              <Card className="mb-8 bg-card/50 border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Flame className="h-6 w-6 text-orange-500" />
                    <CardTitle className="text-xl text-foreground">Brutally Honest Review</CardTitle>
                    <Badge className={`${getToneColor(prValidation.analysis.honest_review.tone)} border`}>
                      {prValidation.analysis.honest_review.tone.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Verdict */}
                  <div className="p-4 bg-gradient-to-r from-red-900/20 to-orange-900/20 border-l-4 border-red-500 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <h3 className="font-semibold text-red-300">Overall Verdict</h3>
                    </div>
                    <p className="text-red-200 leading-relaxed">
                      {prValidation.analysis.honest_review.overall_verdict}
                    </p>
                  </div>

                  {/* Code Quality */}
                  <div className="p-4 bg-orange-900/20 border-l-4 border-orange-500 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-orange-400" />
                      <h3 className="font-semibold text-orange-300">Code Quality</h3>
                    </div>
                    <p className="text-orange-200 leading-relaxed">
                      {prValidation.analysis.honest_review.code_quality_roast}
                    </p>
                  </div>

                  {/* What's Good vs What's Wrong */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-900/20 border-l-4 border-green-500 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="h-5 w-5 text-green-400" />
                        <h3 className="font-semibold text-green-300">✅ What&apos;s Good</h3>
                      </div>
                      <p className="text-green-200 text-sm leading-relaxed">
                        {prValidation.analysis.honest_review.what_they_did_right}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsDown className="h-5 w-5 text-red-400" />
                        <h3 className="font-semibold text-red-300">❌ What&apos;s Wrong</h3>
                      </div>
                      <p className="text-red-200 text-sm leading-relaxed">
                        {prValidation.analysis.honest_review.what_they_fucked_up}
                      </p>
                    </div>
                  </div>

                  {/* Final Verdict */}
                  <div className="p-6 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="h-6 w-6 text-red-400" />
                      <h3 className="font-bold text-red-200 text-lg">Final Verdict</h3>
                    </div>
                    <p className="text-red-100 font-medium leading-relaxed">
                      {prValidation.analysis.honest_review.final_verdict}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reasoning */}
            <Card className="mb-8 bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                  Analysis Reasoning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {prValidation.analysis.reasoning}
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href={`/contributor/dashboard/${projectId}/claim`}>
                  Back to Claim Form
                </Link>
              </Button>
              <Button asChild>
                <Link href="/contributor/dashboard">
                  View All Projects
                </Link>
              </Button>
            </div>

            {/* Footer Info */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>This brutally honest review is generated by our AI system to provide transparent feedback on code quality and contribution value.</p>
              <p className="mt-2">The scoring system helps ensure fair bounty distribution based on actual contribution merit.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
