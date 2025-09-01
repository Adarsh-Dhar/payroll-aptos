"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"

// Define the project data type based on our API response
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

// Define the PR validation type
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

export default function ClaimPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
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

  // Fetch project details when component mounts
  useEffect(() => {
    async function fetchProjectDetails() {
      if (!projectId) return
      
      try {
        setLoading(true)
        setError(null)
        
        // Use absolute URL for client-side fetch
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        
        const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}`, {
          cache: 'no-store',
        })
        
        if (!response.ok) {
          console.error('Project API error:', response.status, response.statusText)
          setError(`API Error: ${response.status} ${response.statusText}`)
          return
        }
        
        const result = await response.json()
        if (result.success) {
          const projectData = result.data
          setProject(projectData)
          
          // Log project details to console
          console.log('Selected Project Details:', {
            id: projectData.id,
            name: projectData.name,
            description: projectData.description,
            repoUrl: projectData.repoUrl,
            budget: projectData.budget,
            isActive: projectData.isActive,
            maxContributors: projectData.maxContributors,
            tags: projectData.tags,
            admin: projectData.Admin,
            pullRequestCount: projectData._count.PullRequest,
            payoutCount: projectData._count.Payout,
            createdAt: projectData.createdAt,
            updatedAt: projectData.updatedAt
          })
          
          // Update form data with project ID
          setFormData(prev => ({ ...prev, projectId: projectId.toString() }))
        } else {
          console.error('Project API error:', result.message)
          setError(result.message || 'Failed to fetch project details')
        }
      } catch (error) {
        console.error('Project fetch error:', error)
        setError('Failed to fetch project details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProjectDetails()
  }, [projectId])

  const validatePR = async () => {
    if (!formData.prUrl || !githubToken || !project?.repoUrl) {
      setValidationError('Please provide PR URL, GitHub token, and ensure project has repository URL');
      return;
    }

    // Validate PR URL format
    const prUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+$/;
    if (!prUrlPattern.test(formData.prUrl)) {
      setValidationError('Invalid PR URL format. Expected: https://github.com/owner/repo/pull/123');
      return;
    }

    // Validate project repository URL format
    const projectRepoPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+$/;
    if (!projectRepoPattern.test(project.repoUrl)) {
      setValidationError('Invalid project repository URL format');
      return;
    }

    try {
      setValidatingPr(true);
      setValidationError(null);
      setPrValidation(null);
      setCalculatedBounty(null);

      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      const response = await fetch(`${baseUrl}/api/v1/contributor/validate-pr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prUrl: formData.prUrl,
          githubToken,
          projectRepoUrl: project.repoUrl
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If we can't parse the error response, use the status text
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.success) {
        setPrValidation(result);
        
        // Calculate bounty amount using the formula: (L + Dx/10)
        if (result.analysis?.final_score && project.highestBounty && project.lowestBounty) {
          const score = result.analysis.final_score;
          const lowestBounty = project.lowestBounty;
          const highestBounty = project.highestBounty;
          const difference = highestBounty - lowestBounty;
          
          // Formula: (L + Dx/10) where L=lowest, D=difference, x=score
          const bountyAmount = lowestBounty + (difference * score / 10);
          setCalculatedBounty(Math.round(bountyAmount * 100) / 100); // Round to 2 decimal places
          
          // Update form data with calculated amount
          setFormData(prev => ({ ...prev, amount: bountyAmount.toFixed(2) }));
          
          console.log('=== BOUNTY CALCULATION ===');
          console.log('PR Score:', score);
          console.log('Lowest Bounty (L):', lowestBounty);
          console.log('Highest Bounty:', highestBounty);
          console.log('Difference (D):', difference);
          console.log('Formula: L + (D × score/10)');
          console.log('Calculation:', `${lowestBounty} + (${difference} × ${score}/10)`);
          console.log('Result:', bountyAmount);
          console.log('Rounded Result:', Math.round(bountyAmount * 100) / 100);
          console.log('============================');
        }
        
        console.log('=== PR VALIDATION SUCCESS ===');
        console.log('Validation result:', result);
        console.log('PR Analysis:', result.analysis);
        console.log('Final Score:', result.analysis?.final_score);
        console.log('Category:', result.analysis?.category);
        console.log('Metric Scores:', result.analysis?.metric_scores);
        console.log('Calculated Bounty:', calculatedBounty);
        console.log('============================');
      } else {
        throw new Error(result.message || 'Validation failed');
      }
    } catch (error) {
      console.error('=== PR VALIDATION ERROR ===');
      console.error('Error details:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        setValidationError(error.message);
      } else {
        setValidationError('Failed to validate PR');
      }
      console.error('============================');
    } finally {
      setValidatingPr(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prValidation) {
      setValidationError('Please validate your PR before submitting the claim');
      return;
    }

    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setSubmitted(true)
  }

  const handleInputChange = (field: keyof ClaimFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation when PR URL changes
    if (field === 'prUrl') {
      setPrValidation(null);
      setValidationError(null);
    }
  }

  // Loading state
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

  // Error state
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
                <h1 className="text-2xl font-semibold mb-4">Claim Submitted Successfully!</h1>
                <p className="text-muted-foreground mb-6">
                  Your bounty claim has been submitted and is under review. You&apos;ll receive a notification once it&apos;s processed.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/contributor/dashboard">
                      Back to Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => setSubmitted(false)}>
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

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl">
        <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
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

           

            {/* Claim Form */}
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
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Project Selection - Now shows selected project */}
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

                  {/* GitHub Token */}
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
                      <a 
                        href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline ml-1"
                      >
                        Learn how to create one
                      </a>
                    </p>
                  </div>

                  {/* PR URL */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pull Request URL</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://github.com/username/repo/pull/123"
                        value={formData.prUrl}
                        onChange={(e) => handleInputChange('prUrl', e.target.value)}
                        required
                        className="flex-1"
                      />
                      <Button 
                        type="button"
                        onClick={validatePR}
                        disabled={!formData.prUrl || !githubToken || validatingPr}
                        variant="outline"
                        className="whitespace-nowrap"
                      >
                        {validatingPr ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Validate PR
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the full GitHub PR URL and click &quot;Validate PR&quot; to verify ownership and get the PR score.
                    </p>
                    {validatingPr && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Validating PR and calculating score...</span>
                      </div>
                    )}
                  </div>

                  {/* PR Validation Results */}
                  {validationError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900">Validation Error</h4>
                          <p className="text-sm text-red-800 mt-1">{validationError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {prValidation && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-green-900">PR Validated Successfully!</h4>
                            <p className="text-sm text-green-800 mt-1">
                              PR #{prValidation.validation.prNumber}: {prValidation.validation.prTitle}
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Author: {prValidation.validation.prAuthor} • Repository: {prValidation.metadata.pr_repository}
                            </p>
                          </div>
                        </div>
                        
                        {/* PR Score Display */}
                        {prValidation.analysis && (
                          <div className="bg-white p-4 rounded-md border border-green-200">
                            <h5 className="font-medium text-green-900 mb-3">PR Analysis Score</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {prValidation.analysis.final_score}/10
                                </div>
                                <div className="text-xs text-green-700">Final Score</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-blue-600 capitalize">
                                  {prValidation.analysis.category}
                                </div>
                                <div className="text-xs text-blue-700">Complexity</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-purple-600">
                                  {prValidation.analysis.metric_scores?.code_size || 'N/A'}/10
                                </div>
                                <div className="text-xs text-purple-700">Code Size</div>
                              </div>
                            </div>
                            
                            {/* Bounty Calculation Display */}
                            {calculatedBounty !== null && (
                              <div className="pt-4 border-t border-green-200">
                                <h6 className="font-medium text-green-900 mb-2">Bounty Calculation</h6>
                                <div className="bg-green-50 p-3 rounded-md">
                                  <div className="text-center mb-2">
                                    <div className="text-2xl font-bold text-green-700">
                                      ${calculatedBounty.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-green-600">Calculated Bounty Amount</div>
                                  </div>
                                  <div className="text-xs text-green-700 text-center">
                                    Formula: ${project.lowestBounty} + (${(project.highestBounty - project.lowestBounty).toFixed(2)} × {prValidation.analysis.final_score}/10)
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Detailed Metrics */}
                            {prValidation.analysis.metric_scores && (
                              <div className="pt-4 border-t border-green-200">
                                <h6 className="font-medium text-green-900 mb-2">Detailed Metrics</h6>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Review Cycles:</span>
                                    <span className="ml-2 font-medium">{prValidation.analysis.metric_scores.review_cycles}/10</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Review Time:</span>
                                    <span className="ml-2 font-medium">{prValidation.analysis.metric_scores.review_time}/10</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">First Review Wait:</span>
                                    <span className="ml-2 font-medium">{prValidation.analysis.metric_scores.first_review_wait}/10</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Review Depth:</span>
                                    <span className="ml-2 font-medium">{prValidation.analysis.metric_scores.review_depth}/10</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Code Quality:</span>
                                    <span className="ml-2 font-medium">{prValidation.analysis.metric_scores.code_quality}/10</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Reasoning and Insights */}
                            {prValidation.analysis.reasoning && (
                              <div className="mt-4 pt-4 border-t border-green-200">
                                <h6 className="font-medium text-green-900 mb-2">Analysis Reasoning</h6>
                                <p className="text-sm text-green-800">{prValidation.analysis.reasoning}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Status */}
                  {!prValidation && !validationError && formData.prUrl && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-900">PR Not Yet Validated</h4>
                          <p className="text-sm text-yellow-800 mt-1">
                            Click &quot;Validate PR&quot; to verify ownership and get the PR score before submitting your claim.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {prValidation && (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-md">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          PR validated successfully! You can now submit your claim.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bounty Amount Field */}
                  {calculatedBounty !== null && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bounty Amount</label>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-green-700">
                              ${calculatedBounty.toLocaleString()}
                            </div>
                            <div className="text-sm text-green-600">Calculated based on PR score</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-green-700">
                              Score: {prValidation?.analysis?.final_score}/10
                            </div>
                            <div className="text-xs text-green-700">
                              Range: ${project.lowestBounty} - ${project.highestBounty}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This amount is automatically calculated using the formula: Lowest Bounty + (Difference × Score/10)
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={isSubmitting || !prValidation}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting Claim...
                      </>
                    ) : !prValidation ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Validate PR First
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Submit Bounty Claim
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Additional Info */}
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
