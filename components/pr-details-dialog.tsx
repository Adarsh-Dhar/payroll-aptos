"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { PR } from "./pr-table"
import { StreamingAmount } from "./streaming-amount"

export function PRDetailsDialog({
  pr,
  onOpenChange,
}: {
  pr: PR | null
  onOpenChange?: (open: boolean) => void
}) {
  const open = Boolean(pr)
  const scoreTotal = useMemo(() => pr?.scoreBreakdown?.reduce((acc, s) => acc + s.value, 0) ?? pr?.score ?? 0, [pr])
  const [copyOk, setCopyOk] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-pretty">{pr?.title ?? "Pull Request"}</DialogTitle>
          <DialogDescription className="sr-only">Pull Request details and streaming payout</DialogDescription>
        </DialogHeader>

        {!pr ? null : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {pr.description || "No description provided."}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {pr.linkedIssue ? (
                  <Badge variant="secondary">Linked Issue</Badge>
                ) : (
                  <Badge variant="outline">No Issue</Badge>
                )}
                {pr.merged ? (
                  <Badge className="bg-indigo-600 text-white hover:bg-indigo-600">Merged</Badge>
                ) : (
                  <Badge>Open</Badge>
                )}
                <Badge variant="outline">Approvals: {pr.approvals ?? 0}</Badge>
                <Badge variant="outline">
                  +{pr.linesAdded ?? 0}/-{pr.linesDeleted ?? 0}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Score</span>
                  <span className="text-sm font-semibold text-indigo-600">{pr.score}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {(pr.scoreBreakdown ?? []).map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-medium">{s.value}</span>
                      </div>
                      <Progress value={(s.value / (scoreTotal || 100)) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Test Coverage</span>
                  <span className="text-sm font-semibold">{(pr.coverage ?? 0).toFixed(0)}%</span>
                </div>
                <Progress value={pr.coverage ?? 0} className="mt-2 h-2" />

                <div className="mt-4">
                  <span className="text-sm font-medium">Streaming Payout</span>
                  <div className="mt-2 text-lg font-semibold">
                    {pr.status === "streaming" && pr.ratePerSec ? (
                      <StreamingAmount
                        currency={pr.currency}
                        base={pr.amountEarned}
                        ratePerSec={pr.ratePerSec}
                        ariaLabel="Live streaming payout"
                      />
                    ) : (
                      <span>
                        {pr.currency}
                        {pr.amountEarned.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {pr.status === "streaming" && pr.ratePerSec ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Rate: {pr.currency}
                      {pr.ratePerSec.toFixed(2)}/sec
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!pr?.linkedIssue) return
                  try {
                    await navigator.clipboard.writeText(pr.linkedIssue)
                    setCopyOk(true)
                    setTimeout(() => setCopyOk(false), 1200)
                  } catch (e) {}
                }}
                disabled={!pr?.linkedIssue}
                aria-label="Copy linked issue URL"
              >
                {copyOk ? "Copied!" : "Copy Issue Link"}
              </Button>
              <div className="text-sm">
                Status:{" "}
                {pr?.status === "streaming" ? (
                  <span className="rounded-md bg-emerald-500 px-2 py-1 font-medium text-white">Streaming</span>
                ) : (
                  <span className="rounded-md bg-muted px-2 py-1">Paid</span>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
