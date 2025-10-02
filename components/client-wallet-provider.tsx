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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WalletProvider } = require("@/app/provider");
  return <WalletProvider>{children}</WalletProvider>;
}
