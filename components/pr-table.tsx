"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { PRDetailsDialog } from "./pr-details-dialog"

export type PR = {
  id: string
  title: string
  score: number
  amountEarned: number
  currency: "₹" | "$" | "€"
  status: "streaming" | "paid"
  ratePerSec?: number
  description?: string
  linkedIssue?: string | null
  linesAdded?: number
  linesDeleted?: number
  coverage?: number
  merged?: boolean
  approvals?: number
  scoreBreakdown?: { label: string; value: number }[]
}

export function PRTable({ data }: { data: PR[] }) {
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PR | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(t)
  }, [])

  const rows = useMemo(() => data, [data])

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[45%]">PR Title</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[80%]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))
            : rows.map((pr, idx) => (
                <motion.tr
                  key={pr.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`border-b transition-colors hover:bg-muted/10 ${pr.status === "streaming" ? "bg-emerald-500/5" : ""}`}
                >
                  <TableCell className="align-top">
                    <div className="max-w-[52ch]">
                      <div className="text-sm font-medium leading-6">{pr.title}</div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                        {pr.description || "No description provided."}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="rounded-md bg-indigo-600/10 px-2 py-1 text-xs font-semibold text-indigo-600">
                      {pr.score}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    {pr.status === "streaming" && pr.ratePerSec ? (
                      <span className="text-sm">
                        <span className="sr-only">Live amount </span>
                        <LiveStreamingCell currency={pr.currency} base={pr.amountEarned} ratePerSec={pr.ratePerSec} />
                      </span>
                    ) : (
                      <span className="text-sm">
                        {pr.currency}
                        {pr.amountEarned.toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {pr.status === "streaming" ? (
                      <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">Streaming</Badge>
                    ) : (
                      <Badge variant="secondary">Paid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <Button size="sm" onClick={() => setSelected(pr)} aria-label={`View details for ${pr.title}`}>
                      View Details
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
        </TableBody>
      </Table>
      <PRDetailsDialog pr={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}

function LiveStreamingCell({
  currency,
  base,
  ratePerSec,
}: { currency: PR["currency"]; base: number; ratePerSec: number }) {
  const [amount, setAmount] = useState(base)
  useEffect(() => {
    const startedAt = performance.now()
    const id = setInterval(() => {
      const elapsedSec = (performance.now() - startedAt) / 1000
      setAmount(base + elapsedSec * ratePerSec)
    }, 250)
    return () => clearInterval(id)
  }, [base, ratePerSec])

  return (
    <span className="font-medium text-foreground">
      {currency}
      {amount.toFixed(2)}
      <span className="text-muted-foreground ml-1 text-xs">
        ({currency}
        {ratePerSec.toFixed(2)}/sec)
      </span>
    </span>
  )
}
