/* eslint-disable no-console */

import { 
  Account, 
  AccountAddress, 
  Aptos, 
  AptosConfig, 
  Network, 
  NetworkToNetworkName,
  InputGenerateTransactionPayloadData,
  TypeTag,
  SimpleTransaction,
  PendingTransactionResponse,
  TransactionResponse
} from "@aptos-labs/ts-sdk";
import dotenv from "dotenv";

dotenv.config();

// Contract configuration
const CONTRACT_ADDRESS = "0xf7cf47bc932807a9242c50f29d2ef998323ca17d8f56b03dfa70b852c438a1c6"; // Deployed contract address on testnet
const CONTRACT_MODULE = "project_escrow_v3";

// Explicitly set to TESTNET to match where the contract is deployed
const APTOS_NETWORK: Network = Network.TESTNET;

// Set up the client with explicit testnet configuration
const config = new AptosConfig({ 
  network: APTOS_NETWORK,
  // Explicitly set the REST API URL to ensure we're using testnet with v1 endpoint
  fullnode: "https://fullnode.testnet.aptoslabs.com/v1"
});
const aptos = new Aptos(config);

// Debug logging to verify network configuration
console.log("Contract client initialized with:", {
  network: APTOS_NETWORK,
  contractAddress: CONTRACT_ADDRESS,
  contractModule: CONTRACT_MODULE,
  fullnodeUrl: "https://fullnode.testnet.aptoslabs.com/v1",
  configNetwork: config.network,
  configFullnode: config.fullnode
});

// Types matching the Move contract
export interface ProjectEscrow {
  balance: number;
  owner: string;
  project_name: string;
}

export interface EscrowVault {
  projects: { handle: string; keys: number[]; length: number };
  total_balance: number;
}

export interface AutoProjectIdGenerator {
  next_project_id: number;
}

export interface WithdrawCapability {
  project_id: number;
  owner: string;
}

// Error codes from the Move contract
export enum ProjectEscrowError {
  PROJECT_NOT_FOUND = 1,
  INSUFFICIENT_BALANCE = 2,
  UNAUTHORIZED = 3,
  ESCROW_NOT_INITIALIZED = 4,
  PROJECT_ALREADY_EXISTS = 5,
  AUTO_ID_NOT_INITIALIZED = 6
}

/**
 * Project Escrow Contract Client
 * Provides all functions to interact with the project escrow contract
 */
export class ProjectEscrowContractClient {
  private aptos: Aptos;
  private contractAddress: string;
  private contractModule: string;

  constructor(aptosInstance?: Aptos, contractAddress?: string, contractModule?: string) {
    this.aptos = aptosInstance || aptos;
    this.contractAddress = contractAddress || CONTRACT_ADDRESS;
    this.contractModule = contractModule || CONTRACT_MODULE;
  }

  /**
   * Initialize the escrow vault (called once by the contract deployer)
   * @param account - The account to initialize the vault under
   * @returns Transaction response
   */
  async initialize(account: Account): Promise<TransactionResponse> {
    const payload: InputGenerateTransactionPayloadData = {
      function: `${this.contractAddress}::${this.contractModule}::initialize`,
      typeArguments: [],
      functionArguments: []
    };

    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    });

    const pendingTxn = await this.aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    return await this.aptos.waitForTransaction({
      transactionHash: pendingTxn.hash,
    });
  }

  /**
   * Create a new project escrow with auto-generated ID (new function)
   * @param account - The account creating the project escrow
   * @param initialAmount - Initial amount to fund in octas
   * @returns Transaction response with the generated project ID
   */
  async createProjectEscrowAuto(
    account: Account,
    initialAmount: number
  ): Promise<TransactionResponse> {
    const payload: InputGenerateTransactionPayloadData = {
      function: `${this.contractAddress}::${this.contractModule}::create_project_escrow_auto`,
      typeArguments: [],
      functionArguments: [initialAmount.toString()]
    };

    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    });

    const pendingTxn = await this.aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    return await this.aptos.waitForTransaction({
      transactionHash: pendingTxn.hash,
    });
  }

  /**
   * Create a new project escrow with a specific ID (keep for backward compatibility)
   * @param account - The account creating the project escrow
   * @param projectId - The unique ID for the project
   * @param initialAmount - Initial amount to fund in octas
   * @param projectName - Name of the project
   * @returns Transaction response
   */
  async createProjectEscrow(
    account: Account,
    projectId: number,
    initialAmount: number,
    projectName: string
  ): Promise<TransactionResponse> {
    const payload: InputGenerateTransactionPayloadData = {
      function: `${this.contractAddress}::${this.contractModule}::create_project_escrow`,
      typeArguments: [],
      functionArguments: [projectId.toString(), initialAmount.toString(), projectName]
    };

    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    });

    const pendingTxn = await this.aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    return await this.aptos.waitForTransaction({
      transactionHash: pendingTxn.hash,
    });
  }

  /**
   * Add more funds to an existing project
   * @param account - The account funding the project
   * @param projectId - The ID of the project to fund
   * @param amount - Amount to add in octas
   * @returns Transaction response
   */
  async fundProject(
    account: Account,
    projectId: number,
    amount: number
  ): Promise<TransactionResponse> {
    const payload: InputGenerateTransactionPayloadData = {
      function: `${this.contractAddress}::${this.contractModule}::fund_project`,
      typeArguments: [],
      functionArguments: [projectId.toString(), amount.toString()]
    };

    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    });

    const pendingTxn = await this.aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    return await this.aptos.waitForTransaction({
      transactionHash: pendingTxn.hash,
    });
  }

  /**
   * Withdraw funds from a project
   * @param account - The account withdrawing funds
   * @param projectId - The ID of the project
   * @param amount - Amount to withdraw in octas
   * @returns Transaction response
   */
  async withdrawFromProject(
    account: Account,
    projectId: number,
    amount: number
  ): Promise<TransactionResponse> {
    const payload: InputGenerateTransactionPayloadData = {
      function: `${this.contractAddress}::${this.contractModule}::withdraw_from_project`,
      typeArguments: [],
      functionArguments: [projectId.toString(), 0.01.toString()]
    };

    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    });

    const pendingTxn = await this.aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    return await this.aptos.waitForTransaction({
      transactionHash: pendingTxn.hash,
    });
  }

  /**
   * Get project balance by ID
   * @param projectId - The ID of the project
   * @returns Project balance in octas
   */
  async getProjectBalance(projectId: number): Promise<number> {
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.contractModule}::get_project_balance`,
          typeArguments: [],
          functionArguments: [projectId.toString()]
        }
      });
      
      if (response && response.length > 0) {
        return Number(response[0]);
      }
      return 0;
    } catch (error) {
      console.log(`Error getting project balance for project ${projectId}:`, error);
      return 0;
    }
  }

  /**
   * Get project owner by ID
   * @param projectId - The ID of the project
   * @returns Project owner address
   */
  async getProjectOwner(projectId: number): Promise<string | null> {
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.contractModule}::get_project_owner`,
          typeArguments: [],
          functionArguments: [this.contractAddress, projectId.toString()]
        }
      });
      
      if (response && response.length > 0) {
        return response[0] as string;
      }
      return null;
    } catch (error) {
      console.log(`Error getting project owner for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Get project name by ID (keep for backward compatibility)
   * @param projectId - The ID of the project
   * @returns Project name
   */
  async getProjectName(projectId: number): Promise<string | null> {
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.contractModule}::get_project_name`,
          typeArguments: [],
          functionArguments: [this.contractAddress, projectId.toString()]
        }
      });
      
      if (response && response.length > 0) {
        // Convert vector<u8> to string
        const bytes = response[0] as number[];
        return String.fromCharCode(...bytes);
      }
      return null;
    } catch (error) {
      console.log(`Error getting project name for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Check if project exists
   * @param projectId - The ID of the project
   * @returns True if project exists
   */
  async projectExists(projectId: number): Promise<boolean> {
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.contractModule}::project_exists`,
          typeArguments: [],
          functionArguments: [this.contractAddress, projectId.toString()]
        }
      });
      
      if (response && response.length > 0) {
        return response[0] as boolean;
      }
      return false;
    } catch (error) {
      console.log(`Error checking project existence for project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Get total balance in contract
   * @returns Total balance in octas
   */
  async getTotalBalance(): Promise<number> {
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.contractModule}::get_total_balance`,
          typeArguments: [],
          functionArguments: [this.contractAddress]
        }
      });
      
      if (response && response.length > 0) {
        return Number(response[0]);
      }
      return 0;
    } catch (error) {
      console.log("Error getting total balance:", error);
      return 0;
    }
  }

  /**
   * Get next available project ID
   * @returns Next available project ID
   */
  async getNextProjectId(): Promise<number> {
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.contractModule}::get_next_project_id`,
          typeArguments: [],
          functionArguments: [this.contractAddress]
        }
      });
      
      if (response && response.length > 0) {
        return Number(response[0]);
      }
      return 0;
    } catch (error) {
      console.log("Error getting next project ID:", error);
      return 0;
    }
  }

  /**
   * Get total number of projects
   * @returns Total number of projects created
   */
  async getTotalProjects(): Promise<number> {
    try {
      const response = await this.aptos.view({
        payload: {
          function: `${this.contractAddress}::${this.contractModule}::get_total_projects`,
          typeArguments: [],
          functionArguments: [this.contractAddress]
        }
      });
      
      if (response && response.length > 0) {
        return Number(response[0]);
      }
      return 0;
    } catch (error) {
      console.log("Error getting total projects:", error);
      return 0;
    }
  }

  /**
   * Get escrow vault data
   * @returns Escrow vault data or null if not found
   */
  async getEscrowVault(): Promise<EscrowVault | null> {
    try {
      const resource = await this.aptos.getAccountResource({
        accountAddress: this.contractAddress,
        resourceType: `${this.contractAddress}::${this.contractModule}::EscrowVault`,
      });
      return resource.data as EscrowVault;
    } catch (error) {
      console.log(`Escrow vault not found at address: ${this.contractAddress}`);
      return null;
    }
  }

  /**
   * Get auto project ID generator data
   * @returns Auto project ID generator data or null if not found
   */
  async getAutoProjectIdGenerator(): Promise<AutoProjectIdGenerator | null> {
    try {
      const resource = await this.aptos.getAccountResource({
        accountAddress: this.contractAddress,
        resourceType: `${this.contractAddress}::${this.contractModule}::AutoProjectIdGenerator`,
      });
      return resource.data as AutoProjectIdGenerator;
    } catch (error) {
      console.log(`Auto project ID generator not found at address: ${this.contractAddress}`);
      return null;
    }
  }

  /**
   * Check if escrow vault is initialized
   * @returns True if vault exists
   */
  async isEscrowVaultInitialized(): Promise<boolean> {
    try {
      await this.aptos.getAccountResource({
        accountAddress: this.contractAddress,
        resourceType: `${this.contractAddress}::${this.contractModule}::EscrowVault`,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if auto project ID generator is initialized
   * @returns True if generator exists
   */
  async isAutoProjectIdGeneratorInitialized(): Promise<boolean> {
    try {
      await this.aptos.getAccountResource({
        accountAddress: this.contractAddress,
        resourceType: `${this.contractAddress}::${this.contractModule}::AutoProjectIdGenerator`,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create and fund a project (high-level function)
   * @param account - The account creating and funding the project
   * @param amountInApt - Amount in APT (will be converted to octas)
   * @returns Transaction hash and status
   */
  async createAndFundProject(
    account: Account,
    amountInApt: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      // Check if escrow vault is initialized
      const isVaultInitialized = await this.isEscrowVaultInitialized();
      if (!isVaultInitialized) {
        return { 
          success: false, 
          error: 'Escrow vault not initialized' 
        };
      }

      // Check if auto project ID generator is initialized
      const isGeneratorInitialized = await this.isAutoProjectIdGeneratorInitialized();
      if (!isGeneratorInitialized) {
        return { 
          success: false, 
          error: 'Auto project ID generator not initialized' 
        };
      }

      // Convert APT to octas
      const amountInOctas = projectEscrowUtils.aptToOctas(amountInApt);
      
      console.log(`Creating and funding project: ${amountInApt} APT = ${amountInOctas} octas`);

      // Create the project escrow
      const result = await this.createProjectEscrowAuto(account, amountInOctas);
      
      return {
        success: true,
        transactionHash: result.hash
      };

    } catch (error) {
      console.error('Error creating and funding project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create and fund a project using wallet adapter (new method)
   * @param accountAddress - The account address
   * @param signAndSubmitTransaction - The wallet adapter's signAndSubmitTransaction function
   * @param amountInApt - Amount in APT (will be converted to octas)
   * @returns Transaction hash and status
   */
  async createAndFundProjectWithWallet(
    accountAddress: string,
    signAndSubmitTransaction: (transaction: any) => Promise<any>,
    amountInApt: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      console.log("Creating project escrow with wallet adapter:", {
        accountAddress,
        amountInApt,
        contractAddress: this.contractAddress,
        contractModule: this.contractModule
      });

      // Check if escrow vault is initialized
      const isVaultInitialized = await this.isEscrowVaultInitialized();
      console.log("Escrow vault initialized:", isVaultInitialized);
      
      if (!isVaultInitialized) {
        return { 
          success: false, 
          error: 'Escrow vault not initialized' 
        };
      }

      // Check if auto project ID generator is initialized
      const isGeneratorInitialized = await this.isAutoProjectIdGeneratorInitialized();
      console.log("Auto project ID generator initialized:", isGeneratorInitialized);
      
      if (!isGeneratorInitialized) {
        return { 
          success: false, 
          error: 'Auto project ID generator not initialized' 
        };
      }

      // Convert APT to octas
      const amountInOctas = projectEscrowUtils.aptToOctas(amountInApt);
      
      console.log(`Creating and funding project: ${amountInApt} APT = ${amountInOctas} octas`);

      // Create the transaction data in the format expected by wallet adapter
      const transactionData = {
        data: {
          function: `${this.contractAddress}::${this.contractModule}::create_project_escrow_auto`,
          typeArguments: [],
          functionArguments: [amountInOctas.toString()]
        },
        options: {
          maxGasAmount: "2000",  // Extremely low gas limit for affordability
          gasUnitPrice: "100"    // Minimum gas price for Testnet
        }
      };

      console.log("Transaction data prepared:", transactionData);
      console.log("Transaction data type:", typeof transactionData);
      console.log("Transaction data keys:", Object.keys(transactionData));

      // Sign and submit using wallet adapter
      console.log("About to call signAndSubmitTransaction...");
      const pendingTxn = await signAndSubmitTransaction(transactionData);
      console.log("Transaction submitted:", pendingTxn);
      
      // Wait for transaction to complete
      const result = await this.aptos.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });
      
      console.log("Transaction completed:", result);
      
      return {
        success: true,
        transactionHash: result.hash
      };

    } catch (error) {
      console.error('Error creating and funding project with wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fund an existing project using wallet adapter (new method)
   * @param accountAddress - The account address
   * @param signAndSubmitTransaction - The wallet adapter's signAndSubmitTransaction function
   * @param projectId - The ID of the project to fund
   * @param amountInApt - Amount in APT (will be converted to octas)
   * @returns Transaction hash and status
   */
  async fundProjectWithWallet(
    accountAddress: string,
    signAndSubmitTransaction: (transaction: any) => Promise<any>,
    projectId: number,
    amountInApt: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      // Check if project exists
      const projectExists = await this.projectExists(projectId);
      if (!projectExists) {
        return { 
          success: false, 
          error: 'Project not found' 
        };
      }

      // Convert APT to octas
      const amountInOctas = projectEscrowUtils.aptToOctas(amountInApt);
      
      console.log(`Funding project ${projectId}: ${amountInApt} APT = ${amountInOctas} octas`);

      // Create the transaction data in the format expected by wallet adapter
      const transactionData = {
        data: {
          function: `${this.contractAddress}::${this.contractModule}::fund_project`,
          typeArguments: [],
          functionArguments: [projectId.toString(), amountInOctas.toString()]
        },
        options: {
          maxGasAmount: "2000",  // Extremely low gas limit for affordability
          gasUnitPrice: "100"    // Minimum gas price for Testnet
        }
      };

      console.log("Transaction data prepared:", transactionData);
      console.log("Transaction data type:", typeof transactionData);
      console.log("Transaction data keys:", Object.keys(transactionData));

      // Sign and submit using wallet adapter
      console.log("About to call signAndSubmitTransaction...");
      const pendingTxn = await signAndSubmitTransaction(transactionData);
      console.log("Transaction submitted:", pendingTxn);
      
      // Wait for transaction to complete
      const result = await this.aptos.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });
      
      return {
        success: true,
        transactionHash: result.hash
      };

    } catch (error) {
      console.error('Error funding project with wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Withdraw bounty from a project using wallet adapter (new method)
   * @param accountAddress - The account address
   * @param signAndSubmitTransaction - The wallet adapter's signAndSubmitTransaction function
   * @param projectId - The ID of the project to withdraw from
   * @param amountInApt - Amount in APT (will be converted to octas)
   * @returns Transaction hash and status
   */
  async withdrawFromProjectWithWallet(
    accountAddress: string,
    signAndSubmitTransaction: (transaction: any) => Promise<any>,
    projectId: number,
    amountInApt: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      // Check if project exists
      const projectExists = await this.projectExists(projectId);
      if (!projectExists) {
        return { 
          success: false, 
          error: 'Project not found' 
        };
      }

      // Check if project has sufficient balance
      const projectBalance = await this.getProjectBalance(projectId);
      const amountInOctas = projectEscrowUtils.aptToOctas(amountInApt);
      
      if (projectBalance < amountInOctas) {
        return {
          success: false,
          error: `Insufficient project balance. Available: ${projectEscrowUtils.formatApt(projectBalance)}, Requested: ${projectEscrowUtils.formatApt(amountInOctas)}`
        };
      }

      console.log(`Withdrawing from project ${projectId}: ${amountInApt} APT = ${amountInOctas} octas`);
      console.log(`Project balance: ${projectEscrowUtils.formatApt(projectBalance)}`);

      // Create the transaction data in the format expected by wallet adapter
      const transactionData = {
        data: {
          function: `${this.contractAddress}::${this.contractModule}::withdraw_from_project`,
          typeArguments: [],
          functionArguments: [projectId.toString(), amountInOctas.toString()]
        },
        options: {
          maxGasAmount: "50000",  // Increase from 2000 to 50000
          gasUnitPrice: "100"    // Minimum gas price for Testnet
        }
      };

      console.log("Transaction data prepared:", transactionData);
      console.log("Transaction data type:", typeof transactionData);
      console.log("Transaction data keys:", Object.keys(transactionData));

      // Sign and submit using wallet adapter
      console.log("About to call signAndSubmitTransaction...");
      const pendingTxn = await signAndSubmitTransaction(transactionData);
      console.log("Transaction submitted:", pendingTxn);
      
      // Wait for transaction to complete
      const result = await this.aptos.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });
      
      return {
        success: true,
        transactionHash: result.hash
      };

    } catch (error) {
      console.error('Error withdrawing from project with wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get project funding status
   * @param projectId - The ID of the project to check
   * @returns Project funding status information
   */
  async getProjectFundingStatus(projectId: number): Promise<{
    exists: boolean;
    balance: number;
    owner: string | null;
  }> {
    try {
      const exists = await this.projectExists(projectId);
      
      if (!exists) {
        return {
          exists: false,
          balance: 0,
          owner: null
        };
      }

      const balance = await this.getProjectBalance(projectId);
      const owner = await this.getProjectOwner(projectId);

      return {
        exists: true,
        balance,
        owner
      };

    } catch (error) {
      console.error('Error getting project funding status:', error);
      return {
        exists: false,
        balance: 0,
        owner: null
      };
    }
  }
}

// Utility functions for common operations
export const projectEscrowUtils = {
  /**
   * Convert APT to octas (1 APT = 100,000,000 octas)
   * @param apt - Amount in APT
   * @returns Amount in octas
   */
  aptToOctas: (apt: number): number => apt * 100_000_000,

  /**
   * Convert octas to APT (1 APT = 100,000,000 octas)
   * @param octas - Amount in octas
   * @returns Amount in APT
   */
  octasToApt: (octas: number): number => octas / 100_000_000,

  /**
   * Format APT amount for display
   * @param octas - Amount in octas
   * @returns Formatted string
   */
  formatApt: (octas: number): string => {
    const apt = projectEscrowUtils.octasToApt(octas);
    return `${apt.toFixed(8)} APT`;
  },

  /**
   * Get error message from error code
   * @param errorCode - Error code from the contract
   * @returns Error message
   */
  getErrorMessage: (errorCode: number): string => {
    switch (errorCode) {
      case ProjectEscrowError.PROJECT_NOT_FOUND: return "Project not found";
      case ProjectEscrowError.INSUFFICIENT_BALANCE: return "Insufficient balance";
      case ProjectEscrowError.UNAUTHORIZED: return "Unauthorized";
      case ProjectEscrowError.ESCROW_NOT_INITIALIZED: return "Escrow not initialized";
      case ProjectEscrowError.PROJECT_ALREADY_EXISTS: return "Project already exists";
      case ProjectEscrowError.AUTO_ID_NOT_INITIALIZED: return "Auto project ID generator not initialized";
      default: return "Unknown error";
    }
  },

  /**
   * Validate Aptos address format
   * @param address - Address to validate
   * @returns True if valid
   */
  isValidAddress: (address: string): boolean => {
    try {
      AccountAddress.fromString(address);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Format address for display
   * @param address - Full address
   * @returns Shortened address
   */
  formatAddress: (address: string): string => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
};

// Export the main client instance
export const projectEscrowClient = new ProjectEscrowContractClient();

// Re-export hooks for project escrow contract
export * from './useVault';
