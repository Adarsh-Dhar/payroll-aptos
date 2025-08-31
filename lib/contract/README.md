# Project Escrow Contract Frontend Interface

This package provides a comprehensive TypeScript interface for interacting with the Aptos project escrow contract from your frontend application.

## Structure

- **`index.ts`** - Main contract client and utility functions
- **`useVault.ts`** - React hooks for contract interactions

## Features

- **Full Contract Coverage**: All functions from the Move contract are available
- **TypeScript Support**: Complete type definitions for all contract structures
- **React Integration**: Custom hooks for easy state management
- **Error Handling**: Comprehensive error handling and validation
- **Utility Functions**: Helper functions for APT conversions and formatting

## Quick Start

```typescript
import { projectEscrowClient, projectEscrowUtils } from '@/lib/contract';
import { useProjectEscrow, useProjectEscrowFormatters } from '@/lib/contract/useVault';

// Use the client directly
const response = await projectEscrowClient.createProjectEscrowAuto(account, amount);

// Use React hooks
const { createProjectEscrowAuto, loading, error } = useProjectEscrow();
const { formatApt, aptToOctas } = useProjectEscrowFormatters();
```

## Main Components

### ProjectEscrowContractClient
The main client class for interacting with the contract.

### React Hooks
- `useProjectEscrow()` - Main hook for contract interactions
- `useProjectEscrowFormatters()` - Hook for formatting utilities
- `useProjectEscrowErrors()` - Hook for error constants
- `useProjectEscrowErrorMessages()` - Hook for error messages

### Utility Functions
- `aptToOctas()` - Convert APT to octas
- `octasToApt()` - Convert octas to APT
- `formatApt()` - Format octas as human-readable APT string
- `formatAddress()` - Format addresses for display
- `isValidAddress()` - Validate Aptos address format
