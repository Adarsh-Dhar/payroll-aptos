# Contract Funding System

This document describes the contract funding system that integrates Aptos blockchain functionality with the project management platform.

## Overview

The system allows admins to fund smart contracts on the Aptos blockchain and then create projects in the database only after successful funding confirmation. This ensures that projects are only created when the underlying contract has sufficient funds.

## Architecture

### Smart Contract (Move)
- **Location**: `contract/sources/main.move`
- **Module**: `fund_withdraw::vault`
- **Purpose**: Manages funded accounts with unique IDs for tracking

### Contract Client (TypeScript)
- **Location**: `lib/contract/index.ts`
- **Class**: `VaultContractClient`
- **Purpose**: Provides TypeScript interface to interact with the Move contract

### Frontend Components
- **FundProjectDialog**: Main dialog for funding projects
- **ContractTestPanel**: Testing interface for contract operations
- **Admin Dashboard**: Integration point for all functionality

## Key Features

### 1. Contract Funding
- Fund contracts with APT tokens
- Automatic conversion from APT to octas (1 APT = 100,000,000 octas)
- Transaction confirmation before project creation

### 2. Project Creation
- Projects are only created after successful funding
- Integration with existing project management system
- Validation of all required fields

### 3. Contract Validation
- Address format validation for Aptos
- Vault initialization status checking
- Funding status monitoring

## Usage

### For Admins

#### 1. Fund and Create Project
1. Click "Fund & Create Project" button in admin dashboard
2. Fill in project details:
   - Project name and description
   - Repository URL
   - Contract address (where vault is deployed)
   - Funding amount in APT
   - Bounty range (USD)
   - Admin ID
3. System will:
   - Validate contract address
   - Check vault initialization
   - Fund the contract
   - Create project in database after successful funding

#### 2. Test Contract Integration
1. Use the "Contract Test Panel" to test contract functionality
2. Check contract status without funding
3. Test funding flow with sample amounts

### For Developers

#### Contract Integration
```typescript
import { projectEscrowClient, projectEscrowUtils } from '@/lib/contract';

// Check if vault is initialized
const [isVaultInitialized, isGeneratorInitialized] = await Promise.all([
  projectEscrowClient.isEscrowVaultInitialized(),
  projectEscrowClient.isAutoProjectIdGeneratorInitialized()
]);

// Fund a project
const result = await projectEscrowClient.fundProject(
  walletAddress,
  contractAddress,
  amountInApt
);

// Convert APT to octas
const octas = vaultUtils.aptToOctas(10.5); // 1,050,000,000 octas
```

## API Endpoints

### Test Contract Funding
- **POST** `/api/v1/contract/test-funding`
- **Body**: `{ contractAddress: string, amountInApt: number }`
- **Purpose**: Test contract funding functionality

### Check Contract Status
- **GET** `/api/v1/contract/test-funding?address={contractAddress}`
- **Purpose**: Check vault initialization and status

## Smart Contract Functions

### Core Functions
- `initialize(account)`: Initialize vault (deployer only)
- `fund(account, contract_address, amount)`: Fund new account
- `withdraw(account, contract_address, account_id, amount)`: Withdraw funds

### View Functions
- `get_account_balance(contract_address, account_id)`: Get account balance
- `get_account_owner(contract_address, account_id)`: Get account owner
- `get_next_id(contract_address)`: Get next available ID

## Security Features

### Validation
- Aptos address format validation
- Contract initialization status checking
- Transaction confirmation before database operations

### Error Handling
- Comprehensive error messages
- Graceful fallbacks for failed operations
- User-friendly error display

## Configuration

### Environment Variables
```bash
APTOS_NETWORK=devnet  # or mainnet, testnet
```

### Contract Addresses
- Update `CONTRACT_ADDRESS` in `lib/contract/index.ts` with deployed contract address
- Ensure contract is deployed and initialized before use

## Testing

### Local Testing
1. Use the Contract Test Panel in admin dashboard
2. Test with sample contract addresses
3. Verify funding flow without actual transactions

### Contract Testing
```bash
# Run Move tests
cd contract
aptos move test
```

## Deployment

### Contract Deployment
1. Deploy the Move contract to Aptos
2. Initialize the vault
3. Update contract address in configuration

### Application Deployment
1. Ensure all environment variables are set
2. Deploy the Next.js application
3. Test contract integration

## Troubleshooting

### Common Issues

#### Contract Not Found
- Verify contract address is correct
- Ensure contract is deployed and initialized
- Check network configuration

#### Funding Fails
- Verify wallet has sufficient APT
- Check contract initialization status
- Ensure proper permissions

#### Database Errors
- Check database connection
- Verify project schema matches
- Check admin ID validity

### Debug Information
- Check browser console for detailed error messages
- Use Contract Test Panel for step-by-step debugging
- Monitor API responses for validation errors

## Future Enhancements

### Planned Features
- Real-time transaction monitoring
- Multi-signature support
- Advanced funding strategies
- Integration with more blockchains

### Technical Improvements
- Wallet connection integration
- Transaction history tracking
- Gas optimization
- Batch funding operations

## Support

For technical support or questions about the contract funding system:
1. Check this documentation
2. Review error messages in the UI
3. Use the Contract Test Panel for debugging
4. Check the browser console for detailed logs

## Contributing

To contribute to the contract funding system:
1. Review the Move contract code
2. Test changes in the Contract Test Panel
3. Ensure all validations pass
4. Update documentation as needed
