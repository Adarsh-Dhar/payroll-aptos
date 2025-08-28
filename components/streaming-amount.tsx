"use client"

import { useEffect, useRef, useState } from "react"

export function StreamingAmount({
  currency,
  base,
  ratePerSec,
  ariaLabel,
}: {
  currency: "₹" | "$" | "€"
  base: number
  ratePerSec: number
  ariaLabel?: string
}) {
  const [amount, setAmount] = useState(base)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    startRef.current = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const elapsedSec = startRef.current ? (now - startRef.current) / 1000 : 0
      setAmount(base + elapsedSec * ratePerSec)
    }, 200)

    return () => clearInterval(id)
  }, [base, ratePerSec])

  return (
    <span aria-live="polite" aria-label={ariaLabel} className="text-indigo-600">
      {currency}
      {amount.toFixed(2)}
    </span>
  )
}
