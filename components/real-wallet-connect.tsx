"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@aptos-labs/wallet-adapter-react"
import { truncateAddress } from "@/lib/utils"

export function RealWalletConnect() {
  const { connected, account, wallets, connect, disconnect } = useWallet()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async (walletName: string) => {
    try {
      setIsConnecting(true)
      await connect(walletName)
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  if (connected && account) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {truncateAddress(account.address.toString())}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="h-8 px-3"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsConnecting(!isConnecting)}
        disabled={isConnecting}
        className="h-8 px-3"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
      
      {isConnecting && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-background p-2 shadow-lg z-50">
          <div className="space-y-1">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet.name)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {wallet.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={wallet.icon}
                    alt={wallet.name}
                    className="h-4 w-4"
                  />
                )}
                {wallet.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
