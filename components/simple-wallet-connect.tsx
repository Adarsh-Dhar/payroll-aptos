"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wallet, ChevronDown, ExternalLink } from "lucide-react";

export function SimpleWalletConnect() {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const handleConnect = async (walletType: string) => {
    try {
      // For now, we'll simulate a connection
      // In a real implementation, this would integrate with actual wallet providers
      const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      setWalletAddress(mockAddress);
      setConnected(true);
      setOpen(false);
      
      // Show a toast or notification
      console.log(`Connected to ${walletType} wallet: ${mockAddress}`);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setWalletAddress("");
    setOpen(false);
  };

  const walletOptions = [
    { name: "Petra", icon: "🦎", description: "Aptos Wallet" },
    { name: "Martian", icon: "🚀", description: "Aptos Wallet" },
    { name: "Pontem", icon: "🏗️", description: "Aptos Wallet" },
    { name: "Nightly", icon: "🌙", description: "Aptos Wallet" },
  ];

  if (connected && walletAddress) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline-block">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="space-y-2">
            <div className="text-sm font-medium">Connected Wallet</div>
            <div className="text-xs text-muted-foreground">
              {walletAddress}
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
            {walletOptions.map((wallet) => (
              <Button
                key={wallet.name}
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleConnect(wallet.name)}
              >
                <span className="text-lg">{wallet.icon}</span>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{wallet.name}</span>
                  <span className="text-xs text-muted-foreground">{wallet.description}</span>
                </div>
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Don't have a wallet?{" "}
            <a 
              href="https://aptos.dev/guides/getting-started" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline inline-flex items-center gap-1"
            >
              Learn more <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
