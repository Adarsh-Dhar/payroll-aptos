"use client"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import ClaimRewardDialog from "@/components/claim-reward-dialog"

interface ClaimFormData {
  projectId: string
  prNumber: string
  prUrl: string
  description: string
  amount: string
}

export default function Page() {
  const [formData, setFormData] = useState<ClaimFormData>({
    projectId: "",
    prNumber: "",
    prUrl: "",
    description: "",
    amount: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Claim dialog state
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)
  const [claimedProjects, setClaimedProjects] = useState<Set<number>>(new Set())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setSubmitted(true)
  }

  const handleInputChange = (field: keyof ClaimFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleClaimBounty = () => {
    setClaimDialogOpen(true)
  }

  const handleBountyClaimed = (projectId: number, bountyAmount: number) => {
    // Add the project to the claimed set
    setClaimedProjects(prev => new Set([...prev, projectId]))
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
                  Your bounty claim has been submitted and is under review. You'll receive a notification once it's processed.
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
          <div className="max-w-2xl mx-auto">
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
                Submit your pull request details to claim your contribution reward.
              </p>
            </div>

            {/* Claim Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Bounty Claim Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Project ID */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project ID</label>
                    <Input
                      placeholder="Enter project ID"
                      value={formData.projectId}
                      onChange={(e) => handleInputChange('projectId', e.target.value)}
                      required
                    />
                  </div>

                  {/* PR Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pull Request Number</label>
                    <Input
                      placeholder="e.g., #123"
                      value={formData.prNumber}
                      onChange={(e) => handleInputChange('prNumber', e.target.value)}
                      required
                    />
                  </div>

                  {/* PR URL */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pull Request URL</label>
                    <Input
                      placeholder="https://github.com/username/repo/pull/123"
                      value={formData.prUrl}
                      onChange={(e) => handleInputChange('prUrl', e.target.value)}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description of Changes</label>
                    <Textarea
                      placeholder="Briefly describe what you implemented or fixed..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      required
                    />
                  </div>

                  {/* Bounty Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bounty Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className="pl-8"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting Claim...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Submit Claim
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Questions about your claim? Contact project administrators or check the project documentation.</p>
            </div>
          </div>
        </main>
      </div>

      {/* Claim Reward Dialog */}
      <ClaimRewardDialog
        isOpen={claimDialogOpen}
        onClose={() => setClaimDialogOpen(false)}
        onBountyClaimed={handleBountyClaimed}
        pr={{
          id: 1,
          prNumber: parseInt(formData.prNumber) || 0,
          title: `PR #${formData.prNumber}`,
          repository: "project-repo",
          additions: 0,
          deletions: 0,
          hasTests: false,
          description: formData.description,
          commits: [],
          linkedIssue: '',
          Project: {
            id: parseInt(formData.projectId) || 1,
            name: "Project",
            repoUrl: formData.prUrl,
            lowestBounty: 100,
            highestBounty: 1000
          }
        }}
      />
    </div>
  )
}
