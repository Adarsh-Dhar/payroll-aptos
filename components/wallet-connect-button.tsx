"use client"

import { useWallet, WalletReadyState } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wallet, ChevronDown } from "lucide-react";
import { ConnectWalletOptionCard } from "./connect-wallet-option-card";
import { useState } from "react";

export function WalletConnectButton() {
  const { wallets, connected, disconnect, account } = useWallet();
  const [open, setOpen] = useState(false);

  const availableWallets = wallets.filter(
    (wallet) => wallet.readyState === WalletReadyState.Installed || wallet.readyState === WalletReadyState.Loadable
  );

  const handleDisconnect = () => {
    disconnect();
    setOpen(false);
  };

  if (connected && account) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline-block">
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="space-y-2">
            <div className="text-sm font-medium">Connected Wallet</div>
            <div className="text-xs text-muted-foreground">
              {account.address}
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDisconnect}
              className="w-full"
            >
              Disconnect
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wallet className="h-4 w-4" />
          Connect Wallet
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium">Connect your wallet</div>
          <div className="space-y-2">
            {availableWallets.length > 0 ? (
              availableWallets.map((wallet) => (
                <ConnectWalletOptionCard 
                  key={wallet.name} 
                  wallet={wallet} 
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No wallets available. Please install a wallet extension.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
