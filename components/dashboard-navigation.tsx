"use client"

import { Button } from "@/components/ui/button"
import { FolderOpen, GitPullRequest } from "lucide-react"

interface DashboardNavigationProps {
  onNavigate: (section: 'projects' | 'prs') => void
}

export function DashboardNavigation({ onNavigate }: DashboardNavigationProps) {
  return (
    <section className="flex space-x-1 rounded-lg bg-muted p-1">
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 justify-start"
        onClick={() => onNavigate('projects')}
      >
        <FolderOpen className="h-4 w-4 mr-2" />
        Available Projects
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex-1 justify-start"
        onClick={() => onNavigate('prs')}
      >
        <GitPullRequest className="h-4 w-4 mr-2" />
        My PRs
      </Button>
    </section>
  )
}
