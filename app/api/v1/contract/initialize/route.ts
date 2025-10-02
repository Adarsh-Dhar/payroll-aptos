import { NextResponse } from 'next/server';
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { projectEscrowClient } from '@/lib/contract';
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

export async function POST() {
  try {
    const privateKeyHex = process.env.APTOS_DEPLOYER_PRIVATE_KEY;

    if (!privateKeyHex) {
      return NextResponse.json(
        { success: false, message: 'Server is not configured to initialize contract (missing APTOS_DEPLOYER_PRIVATE_KEY)' },
        { status: 500 }
      );
    }

    // Check current status first
    const [vault, generator] = await Promise.all([
      projectEscrowClient.isEscrowVaultInitialized(),
      projectEscrowClient.isAutoProjectIdGeneratorInitialized(),
    ]);

    if (vault && generator) {
      return NextResponse.json({ success: true, initialized: true, message: 'Already initialized' });
    }

    // Construct deployer account and initialize
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const account = Account.fromPrivateKey({ privateKey });

    // Ensure the deployer key matches the on-chain contract address
    const deployerAddress = account.accountAddress.toString();
    const expectedAddress = (projectEscrowClient as { contractAddress?: string }).contractAddress;
    if (!expectedAddress || expectedAddress.toLowerCase() !== deployerAddress.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Deployer private key address does not match CONTRACT_ADDRESS',
          details: { deployerAddress, expectedAddress },
        },
        { status: 400 }
      );
    }

    const result = await projectEscrowClient.initialize(account);

    // Re-check after transaction
    const [vault2, generator2] = await Promise.all([
      projectEscrowClient.isEscrowVaultInitialized(),
      projectEscrowClient.isAutoProjectIdGeneratorInitialized(),
    ]);

    const ok = vault2 && generator2;
    return NextResponse.json({ success: ok, initialized: ok, txHash: result.hash });
  } catch (error) {
    const err = error as { message?: string; stack?: string };
    const message = err?.message || 'Failed to initialize contract';
    const stack = err?.stack;
    // Even on error, include expected vs deployer if available
    let deployerAddress: string | undefined;
    let expectedAddress: string | undefined;
    try {
      const privateKeyHex = process.env.APTOS_DEPLOYER_PRIVATE_KEY;
      if (privateKeyHex) {
        const privateKey = new Ed25519PrivateKey(privateKeyHex);
        const account = Account.fromPrivateKey({ privateKey });
        deployerAddress = account.accountAddress.toString();
      }
      expectedAddress = (projectEscrowClient as { contractAddress?: string }).contractAddress;
    } catch {}
    return NextResponse.json(
      {
        success: false,
        message,
        details: {
          deployerAddress,
          expectedAddress,
          hint: 'Ensure APTOS_DEPLOYER_PRIVATE_KEY matches the module address and has Testnet APT balance',
        },
        stack,
      },
      { status: 500 }
    );
  }
}


