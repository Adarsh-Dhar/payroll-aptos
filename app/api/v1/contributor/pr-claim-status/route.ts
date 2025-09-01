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
      bountyAmount,
      projectIdType: typeof projectId,
      projectIdIsNaN: isNaN(Number(projectId))
    });

    // Validate required fields
    if (!action || !prUrl) {
      console.error('Missing required fields:', { action, prUrl });
      return NextResponse.json(
        { success: false, message: 'Missing required fields: action and prUrl' },
        { status: 400 }
      );
    }

    // Validate action value
    if (!['check', 'mark-claimed'].includes(action)) {
      console.error('Invalid action:', action);
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "check" or "mark-claimed"' },
        { status: 400 }
      );
    }

    // Validate projectId for mark-claimed action
    if (action === 'mark-claimed') {
      if (!projectId) {
        console.error('Missing projectId for mark-claimed action');
        return NextResponse.json(
          { success: false, message: 'Missing projectId for mark-claimed action' },
          { status: 400 }
        );
      }
      
      if (isNaN(Number(projectId))) {
        console.error('Invalid projectId for mark-claimed action:', projectId);
        return NextResponse.json(
          { success: false, message: `Invalid projectId for mark-claimed action: ${projectId}` },
          { status: 400 }
        );
      }
    }

    // Extract PR number and repository from PR URL
    const prUrlMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!prUrlMatch) {
      console.error('Invalid PR URL format:', prUrl);
      return NextResponse.json(
        { success: false, message: 'Invalid PR URL format. Expected: https://github.com/owner/repo/pull/number' },
        { status: 400 }
      );
    }

    const [, owner, repository, prNumberStr] = prUrlMatch;
    const prNumber = parseInt(prNumberStr);
    
    if (isNaN(prNumber)) {
      console.error('Invalid PR number in URL:', prNumberStr);
      return NextResponse.json(
        { success: false, message: 'Invalid PR number in URL' },
        { status: 400 }
      );
    }

    console.log('Extracted PR info:', { owner, repository, prNumber });

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
                  { Project: { repoUrl: { contains: `${owner}/${repository}` } } }
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
          
          // Try to get claimedBy and claimedAmount if available
          let claimedBy = 'Unknown';
          let claimedAmount = existingPR.amountPaid;
          
          try {
            if ((existingPR as any)?.bountyClaimedBy) {
              claimedBy = `Developer ${(existingPR as any).bountyClaimedBy}`;
            }
            if ((existingPR as any)?.bountyClaimedAmount) {
              claimedAmount = (existingPR as any).bountyClaimedAmount;
            }
          } catch (e) {
            console.log('Some bounty fields not available in current schema');
          }
          
          return NextResponse.json({
            success: true,
            isClaimed: true,
            message: 'This PR has already been claimed',
            data: {
              prId: existingPR.id,
              claimedBy: claimedBy,
              claimedAt: existingPR.bountyClaimedAt,
              claimedAmount: claimedAmount,
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
      if (!bountyAmount || isNaN(Number(bountyAmount))) {
        console.error('Invalid bountyAmount:', bountyAmount);
        return NextResponse.json(
          { success: false, message: 'Invalid bountyAmount. Must be a valid number' },
          { status: 400 }
        );
      }

      const parsedProjectId = parseInt(projectId);
      if (isNaN(parsedProjectId)) {
        console.error('Invalid projectId:', projectId);
        return NextResponse.json(
          { success: false, message: 'Invalid projectId. Must be a valid number' },
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
                  { Project: { repoUrl: { contains: `${owner}/${repository}` } } }
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
          
          // Build the update data object with only available fields
          const updateData: any = {
            bountyClaimed: true,
            bountyClaimedAt: new Date(),
            amountPaid: Number(bountyAmount),
            updatedAt: new Date(),
          };

          // Try to add fields that might exist in newer schema versions
          try {
            // Check if these fields exist by trying to access them
            if (typeof (existingPR as any)?.bountyClaimedBy !== 'undefined') {
              updateData.bountyClaimedBy = developerId;
            }
            if (typeof (existingPR as any)?.bountyClaimedAmount !== 'undefined') {
              updateData.bountyClaimedAmount = Number(bountyAmount);
            }
          } catch (e) {
            console.log('Some bounty fields not available in current schema, proceeding without them');
          }

          prToUpdate = await prisma.pullRequest.update({
            where: { id: existingPR.id },
            data: updateData
          });
        } else {
          // Create new PR record
          console.log('✅ Creating new PR record as claimed');
          
          // Build the data object with only available fields
          const prData: any = {
            prNumber: prNumber,
            title: `PR #${prNumber} from ${owner}/${repository}`,
            description: `Auto-created PR record for ${owner}/${repository}#${prNumber}`,
            additions: 0,
            deletions: 0,
            hasTests: false,
            linkedIssue: prUrl,
            merged: true,
            score: 8.0,
            amountPaid: Number(bountyAmount),
            developerId: developerId,
            projectId: parsedProjectId,
            bountyAmount: Number(bountyAmount),
            bountyClaimed: true,
            bountyClaimedAt: new Date(),
            updatedAt: new Date(),
          };

          // Try to add fields that might exist in newer schema versions
          try {
            // Check if these fields exist by trying to access them
            if (typeof (existingPR as any)?.bountyClaimedBy !== 'undefined') {
              prData.bountyClaimedBy = developerId;
            }
            if (typeof (existingPR as any)?.bountyClaimedAmount !== 'undefined') {
              prData.bountyClaimedAmount = Number(bountyAmount);
            }
          } catch (e) {
            console.log('Some bounty fields not available in current schema, proceeding without them');
          }

          prToUpdate = await prisma.pullRequest.create({
            data: prData
          });
        }

        // Create payout record
        const payout = await prisma.payout.create({
          data: {
            id: `bounty-${parsedProjectId}-${prNumber}-${Date.now()}`,
            amount: Number(bountyAmount),
            developerId: developerId,
            projectId: parsedProjectId,
            status: 'completed',
            transactionId: `bounty-${parsedProjectId}-${prNumber}-${Date.now()}`,
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
