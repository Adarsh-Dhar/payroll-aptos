import { NextRequest, NextResponse } from 'next/server';
import { projectEscrowClient, projectEscrowUtils } from '@/lib/contract';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress, amountInApt } = body;

    if (!contractAddress || !amountInApt) {
      return NextResponse.json(
        { success: false, message: 'Contract address and amount are required' },
        { status: 400 }
      );
    }

    // Validate contract address
    if (!projectEscrowUtils.isValidAddress(contractAddress)) {
      return NextResponse.json(
        { success: false, message: 'Invalid Aptos contract address format' },
        { status: 400 }
      );
    }

    // Check if contract is initialized
    const [isVaultInitialized, isGeneratorInitialized] = await Promise.all([
      projectEscrowClient.isEscrowVaultInitialized(),
      projectEscrowClient.isAutoProjectIdGeneratorInitialized()
    ]);
    
    if (!isVaultInitialized || !isGeneratorInitialized) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Contract not fully initialized at the specified address',
          details: { isVaultInitialized, isGeneratorInitialized }
        },
        { status: 400 }
      );
    }

    // For testing purposes, we'll simulate funding by checking if we can get project data
    // In real implementation, this would call the actual contract
    try {
      const totalBalance = await projectEscrowClient.getTotalBalance();
      const nextProjectId = await projectEscrowClient.getNextProjectId();
      
            // Simulate successful funding
      const fundingResult = {
        success: true,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}` // Mock transaction hash
      };

      return NextResponse.json({
        success: true,
        data: {
          contractAddress,
          amountInApt,
          amountInOctas: projectEscrowUtils.aptToOctas(amountInApt),
          transactionHash: fundingResult.transactionHash,
          contractStatus: { isVaultInitialized, isGeneratorInitialized, totalBalance, nextProjectId }
        },
        message: 'Contract funding test completed successfully'
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Failed to get contract status' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Contract funding test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('address');

    if (!contractAddress) {
      return NextResponse.json(
        { success: false, message: 'Contract address is required' },
        { status: 400 }
      );
    }

    // Validate contract address
    if (!projectEscrowUtils.isValidAddress(contractAddress)) {
      return NextResponse.json(
        { success: false, message: 'Invalid Aptos contract address format' },
        { status: 400 }
      );
    }

    // Get contract status
    const [isVaultInitialized, isGeneratorInitialized, totalBalance, nextProjectId] = await Promise.all([
      projectEscrowClient.isEscrowVaultInitialized(),
      projectEscrowClient.isAutoProjectIdGeneratorInitialized(),
      projectEscrowClient.getTotalBalance(),
      projectEscrowClient.getNextProjectId()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        contractAddress,
        contractStatus: { isVaultInitialized, isGeneratorInitialized, totalBalance, nextProjectId },
        formattedAddress: projectEscrowUtils.formatAddress(contractAddress)
      }
    });

  } catch (error) {
    console.error('Contract status check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
