import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('=== PR CLAIM STATUS API REQUEST ===');
    
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    console.log('Session found:', !!session);
    console.log('Session user:', session?.user);
    
    if (!session?.user?.email) {
      console.log('No session or user email found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session found' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log('Raw request body:', body);
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { action, prUrl, projectId, bountyAmount } = body;
    
    console.log('Parsed request data:', {
      action,
      prUrl,
      projectId,
      bountyAmount
    });

    if (!action || !prUrl) {
      console.error('Missing required fields:', { action, prUrl });
      return NextResponse.json(
        { success: false, message: 'Missing required fields: action and prUrl' },
        { status: 400 }
      );
    }

    // Extract PR number and repository from PR URL
    const prUrlMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+\/pull\/(\d+))/);
    if (!prUrlMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid PR URL format' },
        { status: 400 }
      );
    }

    const [, repository, prNumberStr] = prUrlMatch;
    const prNumber = parseInt(prNumberStr);
    
    if (isNaN(prNumber)) {
      return NextResponse.json(
        { success: false, message: 'Invalid PR number in URL' },
        { status: 400 }
      );
    }

    console.log('Extracted PR info:', { repository, prNumber });

    // Get developer ID from session
    const sessionUser = session.user as any;
    let developerId = null;
    
    try {
      const developer = await prisma.developer.findFirst({
        where: {
          OR: [
            { email: sessionUser.email },
            { githubId: sessionUser.githubUsername || sessionUser.login }
          ]
        },
        select: { id: true }
      });
      
      if (developer) {
        developerId = developer.id;
        console.log('✅ Developer found in database:', developerId);
      } else {
        console.log('⚠️ Developer not found in database, creating new one...');
        
        // Create new developer record
        const newDeveloper = await prisma.developer.create({
          data: {
            githubId: sessionUser.githubUsername || sessionUser.login || sessionUser.email,
            username: sessionUser.githubUsername || sessionUser.login || sessionUser.name || sessionUser.email,
            email: sessionUser.email,
            updatedAt: new Date(),
          } as any
        });
        
        developerId = newDeveloper.id;
        console.log('✅ New developer created:', developerId);
      }
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to process developer information' },
        { status: 500 }
      );
    }

    if (action === 'check') {
      // Check if PR is already claimed
      try {
        // Look for existing PR with this URL
        const existingPR = await prisma.pullRequest.findFirst({
          where: {
            OR: [
              { linkedIssue: prUrl },
              { 
                AND: [
                  { prNumber: prNumber },
                  { Project: { repoUrl: { contains: repository } } }
                ]
              }
            ]
          },
          include: {
            Project: {
              select: {
                id: true,
                name: true,
                repoUrl: true,
              }
            }
          }
        });

        if (existingPR) {
          if (existingPR.bountyClaimed) {
            console.log('⚠️ PR already claimed');
            return NextResponse.json({
              success: true,
              isClaimed: true,
              message: 'This PR has already been claimed',
              data: {
                prId: existingPR.id,
                claimedBy: existingPR.bountyClaimedBy,
                claimedAt: existingPR.bountyClaimedAt,
                claimedAmount: existingPR.bountyClaimedAmount || existingPR.amountPaid,
                projectId: existingPR.projectId
              }
            });
          } else {
            console.log('✅ PR found but not claimed');
            return NextResponse.json({
              success: true,
              isClaimed: false,
              message: 'PR is available for claiming',
              data: {
                prId: existingPR.id,
                projectId: existingPR.projectId
              }
            });
          }
        } else {
          console.log('ℹ️ PR not found in database');
          return NextResponse.json({
            success: true,
            isClaimed: false,
            message: 'PR not found in database - available for claiming',
            data: {
              projectId: projectId ? parseInt(projectId) : null
            }
          });
        }
      } catch (error) {
        console.error('Error checking PR status:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to check PR status' },
          { status: 500 }
        );
      }
    } else if (action === 'mark-claimed') {
      if (!bountyAmount || !projectId) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields for marking as claimed: bountyAmount and projectId' },
          { status: 400 }
        );
      }

      try {
        // First check if PR is already claimed
        const existingPR = await prisma.pullRequest.findFirst({
          where: {
            OR: [
              { linkedIssue: prUrl },
              { 
                AND: [
                  { prNumber: prNumber },
                  { Project: { repoUrl: { contains: repository } } }
                ]
              }
            ]
          }
        });

        if (existingPR && existingPR.bountyClaimed) {
          console.log('⚠️ PR already claimed, cannot mark again');
          return NextResponse.json(
            { success: false, message: 'PR is already claimed and cannot be claimed again' },
            { status: 409 }
          );
        }

        let prToUpdate;
        
        if (existingPR) {
          // Update existing PR
          console.log('✅ Updating existing PR as claimed');
          prToUpdate = await prisma.pullRequest.update({
            where: { id: existingPR.id },
            data: {
              bountyClaimed: true,
              bountyClaimedAt: new Date(),
              bountyClaimedBy: developerId,
              bountyClaimedAmount: bountyAmount,
              amountPaid: bountyAmount,
              updatedAt: new Date(),
            } as any
          });
        } else {
          // Create new PR record
          console.log('✅ Creating new PR record as claimed');
          prToUpdate = await prisma.pullRequest.create({
            data: {
              prNumber: prNumber,
              title: `PR #${prNumber} from ${repository}`,
              description: `Auto-created PR record for ${repository}#${prNumber}`,
              additions: 0,
              deletions: 0,
              hasTests: false,
              linkedIssue: prUrl,
              merged: true,
              score: 8.0,
              amountPaid: bountyAmount,
              developerId: developerId,
              projectId: parseInt(projectId),
              bountyAmount: bountyAmount,
              bountyClaimed: true,
              bountyClaimedAt: new Date(),
              bountyClaimedBy: developerId,
              bountyClaimedAmount: bountyAmount,
              updatedAt: new Date(),
            } as any
          });
        }

        // Create payout record
        const payout = await prisma.payout.create({
          data: {
            id: `bounty-${projectId}-${prNumber}-${Date.now()}`,
            amount: bountyAmount,
            developerId: developerId,
            projectId: parseInt(projectId),
            status: 'completed',
            transactionId: `bounty-${projectId}-${prNumber}-${Date.now()}`,
            updatedAt: new Date(),
          } as any
        });

        console.log('✅ PR marked as claimed successfully');
        console.log('✅ Payout record created:', payout.id);

        return NextResponse.json({
          success: true,
          message: 'PR marked as claimed successfully',
          data: {
            prId: prToUpdate.id,
            payoutId: payout.id,
            claimedAt: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('Error marking PR as claimed:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to mark PR as claimed' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "check" or "mark-claimed"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('=== PR CLAIM STATUS API ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (typeof prisma !== 'undefined') {
      await prisma.$disconnect();
    }
  }
}

// Add GET method for testing
export async function GET() {
  return NextResponse.json({
    message: 'PR Claim Status API is running',
    timestamp: new Date().toISOString()
  });
}
