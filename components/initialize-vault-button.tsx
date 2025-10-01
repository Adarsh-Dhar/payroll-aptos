"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Loader2, Wallet } from "lucide-react"
import { projectEscrowClient } from "@/lib/contract"
import { useToast } from "@/hooks/use-toast"

// Extend Window interface for Aptos wallet
declare global {
  interface Window {
    aptos?: {
      account: () => Promise<any>
      connect: () => Promise<void>
    }
  }
}

interface InitializeVaultButtonProps {
  isVaultInitialized: boolean
  isGeneratorInitialized: boolean
  onInitialized: () => void
}

export function InitializeVaultButton({ 
  isVaultInitialized, 
  isGeneratorInitialized, 
  onInitialized 
}: InitializeVaultButtonProps) {
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showWalletConnect, setShowWalletConnect] = useState(false)
  const { toast } = useToast()

  const handleInitialize = async () => {
    if (isInitializing) return

    // Check if wallet is connected
    if (typeof window !== 'undefined' && !window.aptos) {
      setShowWalletConnect(true)
      toast({
        title: "Wallet Required",
        description: "Please connect your Aptos wallet to initialize the contract.",
        variant: "destructive",
      })
      return
    }

    setIsInitializing(true)
    setError(null)
    setSuccess(false)

    try {
      // Get the connected account from the wallet
      const account = await window.aptos!.account()
      
      if (!account) {
        throw new Error("No account connected")
      }

      toast({
        title: "Initialization Started",
        description: "Initializing escrow vault and project ID generator...",
      })

      // Initialize the escrow vault
      const result = await projectEscrowClient.initialize(account)
      
      // The initialize function returns TransactionResponse, so we check for success
      // by checking if the transaction hash exists
      if (result.hash) {
        setSuccess(true)
        toast({
          title: "Initialization Successful",
          description: "Escrow vault and project ID generator have been initialized.",
        })
        onInitialized()
      } else {
        throw new Error("Initialization failed - no transaction hash returned")
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize vault"
      setError(errorMessage)
      toast({
        title: "Initialization Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  // On mount: if not initialized, attempt initialization (requires connected wallet)
  useEffect(() => {
    if (!isVaultInitialized || !isGeneratorInitialized) {
      // Only attempt if wallet API is available in browser
      if (typeof window !== 'undefined' && window.aptos) {
        // Fire and forget; handleInitialize has its own guards/toasts
        void handleInitialize()
      }
    }
    // We intentionally exclude handleInitialize from deps to avoid re-creating
    // and re-triggering the effect; it doesn't rely on changing refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVaultInitialized, isGeneratorInitialized])

  const handleConnectWallet = () => {
    if (typeof window !== 'undefined' && window.aptos) {
      window.aptos.connect()
      setShowWalletConnect(false)
    }
  }

  // Don't show if both are already initialized
  if (isVaultInitialized && isGeneratorInitialized) {
    return null
  }

  return (
   <></>
  )
}
