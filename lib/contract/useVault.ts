"use client"

import { useState, useCallback, useEffect } from 'react';
import { Account } from '@aptos-labs/ts-sdk';
import { 
  projectEscrowClient, 
  projectEscrowUtils, 
  ProjectEscrowError,
  type ProjectEscrow,
  type EscrowVault,
  type AutoProjectIdGenerator
} from './index';

export interface UseProjectEscrowState {
  loading: boolean;
  error: string | null;
  escrowVault: EscrowVault | null;
  autoProjectIdGenerator: AutoProjectIdGenerator | null;
  vaultInitialized: boolean;
  generatorInitialized: boolean;
  nextProjectId: number;
  totalProjects: number;
  totalBalance: number;
  projectEscrows: ProjectEscrow[];
}

export interface UseProjectEscrowActions {
  initialize: (account: Account) => Promise<string | null>;
  createProjectEscrowAuto: (account: Account, initialAmount: number) => Promise<string | null>;
  createProjectEscrow: (account: Account, projectId: number, initialAmount: number, projectName: string) => Promise<string | null>;
  fundProject: (account: Account, projectId: number, amount: number) => Promise<string | null>;
  withdrawFromProject: (account: Account, projectId: number, amount: number) => Promise<string | null>;
  getProjectBalance: (projectId: number) => Promise<number>;
  getProjectOwner: (projectId: number) => Promise<string | null>;
  getProjectName: (projectId: number) => Promise<string | null>;
  projectExists: (projectId: number) => Promise<boolean>;
  getTotalBalance: () => Promise<number>;
  getNextProjectId: () => Promise<number>;
  getTotalProjects: () => Promise<number>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export interface UseProjectEscrowReturn extends UseProjectEscrowState, UseProjectEscrowActions {}

/**
 * React hook for interacting with the project escrow contract
 * @param contractAddress - The contract address to interact with (optional, uses default from client)
 * @returns Object with state and actions for the project escrow contract
 */
export const useProjectEscrow = (): UseProjectEscrowReturn => {
  const [state, setState] = useState<UseProjectEscrowState>({
    loading: false,
    error: null,
    escrowVault: null,
    autoProjectIdGenerator: null,
    vaultInitialized: false,
    generatorInitialized: false,
    nextProjectId: 0,
    totalProjects: 0,
    totalBalance: 0,
    projectEscrows: [],
  });

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading, error: loading ? null : prev.error }));
  }, []);

  // Set error state
  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  // Refresh contract data
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check contract initialization status
      const [isVaultInitialized, isGeneratorInitialized] = await Promise.all([
        projectEscrowClient.isEscrowVaultInitialized(),
        projectEscrowClient.isAutoProjectIdGeneratorInitialized()
      ]);
      
      if (isVaultInitialized && isGeneratorInitialized) {
        // Get contract data
        const [nextProjectId, totalProjects, totalBalance, escrowVault, autoProjectIdGenerator] = await Promise.all([
          projectEscrowClient.getNextProjectId(),
          projectEscrowClient.getTotalProjects(),
          projectEscrowClient.getTotalBalance(),
          projectEscrowClient.getEscrowVault(),
          projectEscrowClient.getAutoProjectIdGenerator()
        ]);

        // Get project escrow data for each project
        const projectEscrows: ProjectEscrow[] = [];
        
        for (let i = 0; i < totalProjects; i++) {
          try {
            const [balance, owner, projectName, exists] = await Promise.all([
              projectEscrowClient.getProjectBalance(i),
              projectEscrowClient.getProjectOwner(i),
              projectEscrowClient.getProjectName(i),
              projectEscrowClient.projectExists(i)
            ]);

            if (exists && owner) {
              projectEscrows.push({
                balance,
                owner,
                project_name: projectName || `Project ${i}`,
              });
            }
          } catch (error) {
            console.warn(`Error fetching project ${i} data:`, error);
            // Continue with other projects
          }
        }
        
        setState(prev => ({
          ...prev,
          escrowVault,
          autoProjectIdGenerator,
          vaultInitialized: true,
          generatorInitialized: true,
          nextProjectId,
          totalProjects,
          totalBalance,
          projectEscrows,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          escrowVault: null,
          autoProjectIdGenerator: null,
          vaultInitialized: isVaultInitialized,
          generatorInitialized: isGeneratorInitialized,
          nextProjectId: 0,
          totalProjects: 0,
          totalBalance: 0,
          projectEscrows: [],
          error: null,
        }));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh contract data');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Initialize escrow vault
  const initialize = useCallback(async (account: Account): Promise<string | null> => {
    try {
      setLoading(true);
      const response = await projectEscrowClient.initialize(account);
      await refreshData();
      return response.hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize escrow vault';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshData, setLoading, setError]);

  // Create project escrow with auto-generated ID
  const createProjectEscrowAuto = useCallback(async (
    account: Account, 
    initialAmount: number
  ): Promise<string | null> => {
    try {
      setLoading(true);
      const response = await projectEscrowClient.createProjectEscrowAuto(account, initialAmount);
      await refreshData();
      return response.hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project escrow';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshData, setLoading, setError]);

  // Create project escrow with specific ID
  const createProjectEscrow = useCallback(async (
    account: Account, 
    projectId: number, 
    initialAmount: number, 
    projectName: string
  ): Promise<string | null> => {
    try {
      setLoading(true);
      const response = await projectEscrowClient.createProjectEscrow(account, projectId, initialAmount, projectName);
      await refreshData();
      return response.hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project escrow';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshData, setLoading, setError]);

  // Fund project
  const fundProject = useCallback(async (
    account: Account, 
    projectId: number, 
    amount: number
  ): Promise<string | null> => {
    try {
      setLoading(true);
      const response = await projectEscrowClient.fundProject(account, projectId, amount);
      await refreshData();
      return response.hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fund project';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshData, setLoading, setError]);

  // Withdraw from project
  const withdrawFromProject = useCallback(async (
    account: Account, 
    projectId: number, 
    amount: number
  ): Promise<string | null> => {
    try {
      setLoading(true);
      const response = await projectEscrowClient.withdrawFromProject(account, projectId, amount);
      await refreshData();
      return response.hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw from project';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshData, setLoading, setError]);

  // Get project balance
  const getProjectBalance = useCallback(async (projectId: number): Promise<number> => {
    try {
      return await projectEscrowClient.getProjectBalance(projectId);
    } catch (error) {
      console.error('Error getting project balance:', error);
      return 0;
    }
  }, []);

  // Get project owner
  const getProjectOwner = useCallback(async (projectId: number): Promise<string | null> => {
    try {
      return await projectEscrowClient.getProjectOwner(projectId);
    } catch (error) {
      console.error('Error getting project owner:', error);
      return null;
    }
  }, []);

  // Get project name
  const getProjectName = useCallback(async (projectId: number): Promise<string | null> => {
    try {
      return await projectEscrowClient.getProjectName(projectId);
    } catch (error) {
      console.error('Error getting project name:', error);
      return null;
    }
  }, []);

  // Check if project exists
  const projectExists = useCallback(async (projectId: number): Promise<boolean> => {
    try {
      return await projectEscrowClient.projectExists(projectId);
    } catch (error) {
      console.error('Error checking project existence:', error);
      return false;
    }
  }, []);

  // Get total balance
  const getTotalBalance = useCallback(async (): Promise<number> => {
    try {
      return await projectEscrowClient.getTotalBalance();
    } catch (error) {
      console.error('Error getting total balance:', error);
      return 0;
    }
  }, []);

  // Get next project ID
  const getNextProjectId = useCallback(async (): Promise<number> => {
    try {
      return await projectEscrowClient.getNextProjectId();
    } catch (error) {
      console.error('Error getting next project ID:', error);
      return 0;
    }
  }, []);

  // Get total projects
  const getTotalProjects = useCallback(async (): Promise<number> => {
    try {
      return await projectEscrowClient.getTotalProjects();
    } catch (error) {
      console.error('Error getting total projects:', error);
      return 0;
    }
  }, []);

  // Auto-refresh data when component mounts
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    ...state,
    initialize,
    createProjectEscrowAuto,
    createProjectEscrow,
    fundProject,
    withdrawFromProject,
    getProjectBalance,
    getProjectOwner,
    getProjectName,
    projectExists,
    getTotalBalance,
    getNextProjectId,
    getTotalProjects,
    refreshData,
    clearError,
  };
};

/**
 * Hook for getting formatted values
 */
export const useProjectEscrowFormatters = () => {
  const formatApt = useCallback((octas: number) => projectEscrowUtils.formatApt(octas), []);
  const aptToOctas = useCallback((apt: number) => projectEscrowUtils.aptToOctas(apt), []);
  const octasToApt = useCallback((octas: number) => projectEscrowUtils.octasToApt(octas), []);
  const formatAddress = useCallback((address: string) => projectEscrowUtils.formatAddress(address), []);
  const isValidAddress = useCallback((address: string) => projectEscrowUtils.isValidAddress(address), []);

  return {
    formatApt,
    aptToOctas,
    octasToApt,
    formatAddress,
    isValidAddress,
  };
};

/**
 * Hook for getting project escrow error constants
 */
export const useProjectEscrowErrors = () => {
  return {
    PROJECT_NOT_FOUND: ProjectEscrowError.PROJECT_NOT_FOUND,
    INSUFFICIENT_BALANCE: ProjectEscrowError.INSUFFICIENT_BALANCE,
    UNAUTHORIZED: ProjectEscrowError.UNAUTHORIZED,
    ESCROW_NOT_INITIALIZED: ProjectEscrowError.ESCROW_NOT_INITIALIZED,
    PROJECT_ALREADY_EXISTS: ProjectEscrowError.PROJECT_ALREADY_EXISTS,
    AUTO_ID_NOT_INITIALIZED: ProjectEscrowError.AUTO_ID_NOT_INITIALIZED,
  };
};

/**
 * Hook for getting error messages
 */
export const useProjectEscrowErrorMessages = () => {
  const getErrorMessage = useCallback((errorCode: number) => projectEscrowUtils.getErrorMessage(errorCode), []);
  
  return {
    getErrorMessage,
  };
};
