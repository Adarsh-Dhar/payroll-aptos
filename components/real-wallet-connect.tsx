"use client"

import { useWallet, WalletReadyState } from "@aptos-labs/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wallet, ChevronDown, AlertCircle } from "lucide-react";
import { useState } from "react";

export function RealWalletConnect() {
  const { wallets, connected, disconnect, account, connect } = useWallet();
  const [open, setOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const availableWallets = wallets?.filter(
    (wallet) => wallet.readyState === WalletReadyState.Installed
  ) || [];

  const notInstalledWallets = wallets?.filter(
    (wallet) => wallet.readyState === WalletReadyState.NotDetected
  ) || [];

  const handleConnect = async (walletName: string) => {
    try {
      setIsConnecting(true);
      setOpen(false);
      await connect(walletName);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

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
              {account.address.toString().slice(0, 6)}...{account.address.toString().slice(-4)}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="space-y-2">
            <div className="text-sm font-medium">Connected Wallet</div>
            <div className="text-xs text-muted-foreground">
              {account.address.toString()}
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
        <Button variant="outline" className="gap-2" disabled={isConnecting}>
          <Wallet className="h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium">Connect your wallet</div>
          
          {availableWallets.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">Available Wallets</div>
              {availableWallets.map((wallet) => (
                <Button
                  key={wallet.name}
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleConnect(wallet.name)}
                  disabled={isConnecting}
                >
                  <img 
                    src={wallet.icon} 
                    alt={wallet.name} 
                    className="w-6 h-6 rounded"
                  />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{wallet.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Installed
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {notInstalledWallets.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">Not Installed</div>
              {notInstalledWallets.map((wallet) => (
                <div
                  key={wallet.name}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={wallet.icon} 
                      alt={wallet.name} 
                      className="w-6 h-6 rounded"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{wallet.name}</span>
                      <span className="text-xs text-muted-foreground">Not installed</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(wallet.url, '_blank')}
                  >
                    Install
                  </Button>
                </div>
              ))}
            </div>
          )}

          {availableWallets.length === 0 && notInstalledWallets.length === 0 && (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm text-muted-foreground">
                No wallets detected. Please install a wallet extension.
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Popular wallets:{" "}
            <a 
              href="https://petra.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Petra
            </a>
            ,{" "}
            <a 
              href="https://martianwallet.xyz/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Martian
            </a>
            ,{" "}
            <a 
              href="https://pontem.network/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Pontem
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
