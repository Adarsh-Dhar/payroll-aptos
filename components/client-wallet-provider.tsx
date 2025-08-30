"use client"

import { PropsWithChildren, useEffect, useState } from "react";

export function ClientWalletProvider({ children }: PropsWithChildren) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  // Dynamically import the wallet provider only on client side
  const WalletProvider = require("@/app/provider").WalletProvider;
  return <WalletProvider>{children}</WalletProvider>;
}
