"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Github } from "lucide-react"
import { useSession } from "next-auth/react"
import { RealWalletConnect } from "./real-wallet-connect"

export function AppHeader() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  // Get user avatar and fallback initials
  const userAvatar = session?.user?.image
  const userName = session?.user?.name || "User"
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="px-4 py-3">
                <SheetTitle className="text-base">Navigation</SheetTitle>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex items-center gap-2" aria-label="DevPayStream Home">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-indigo-600 text-white ring-1 ring-indigo-500/30 shadow-sm">
              <span className="text-xs font-semibold">DP</span>
            </div>
            <span className="text-balance text-sm font-semibold md:text-base">DevPayStream</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <RealWalletConnect />
          <Button asChild variant="ghost" size="icon" aria-label="GitHub Repository">
            <a href="#" aria-label="Open project GitHub">
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <Avatar>
            <AvatarImage src={userAvatar || ''} alt={`${userName} avatar`} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
