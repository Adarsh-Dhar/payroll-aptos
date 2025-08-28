import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { PRTable } from "@/components/pr-table"
import { mockPRs } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  const activeStreams = mockPRs.filter((p) => p.status === "streaming").length
  const todayEarned = mockPRs.filter((p) => p.status === "paid").reduce((acc, p) => acc + (p.amountEarned ?? 0), 0)
  const avgScore =
    mockPRs.length > 0 ? Math.round((mockPRs.reduce((a, p) => a + (p.score ?? 0), 0) / mockPRs.length) * 10) / 10 : 0

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl">
        {/* Sidebar (desktop) */}
        <AppSidebar className="hidden shrink-0 border-r bg-card/30 p-4 md:block md:w-64" />
        {/* Main */}
        <main className="flex-1 p-4 md:p-6">
          <section className="mb-6">
            <h1 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">Developer Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Track contribution scores, live streaming payouts, and recent activity.
            </p>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="border bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active Streams</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div className="text-2xl font-semibold">{activeStreams}</div>
                <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-400">
                  live
                </span>
              </CardContent>
            </Card>

            <Card className="border bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Today Earned</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">${todayEarned.toFixed(2)}</CardContent>
            </Card>

            <Card className="border bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Avg PR Score</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-indigo-400">{avgScore}</CardContent>
            </Card>
          </section>

          <section aria-labelledby="recent-prs">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-prs" className="text-balance text-lg font-medium">
                Recent Pull Requests
              </h2>
            </div>
            <PRTable data={mockPRs} />
          </section>
        </main>
      </div>
    </div>
  )
}
