"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutGrid, GitPullRequest, Wallet, Settings } from "lucide-react"

type SidebarProps = {
  className?: string
}

export function AppSidebar({ className }: SidebarProps) {
  return (
    <aside className={cn("h-[calc(100dvh-56px)]", className)} aria-label="Primary">
      <AppSidebarContent />
    </aside>
  )
}

export function AppSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const items = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  ]

  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm outline-none transition-colors border-l-2",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-indigo-600",
              isActive
                ? "border-indigo-500 bg-indigo-500/10 text-foreground font-medium"
                : "border-transparent text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn("h-4 w-4", isActive ? "text-indigo-400" : "text-muted-foreground")}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
