import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

export async function POST(request: NextRequest) {
  // Initialize Prisma client at the top level
  const prisma = new PrismaClient();
  
  try {
    console.log('=== MARK PR AS CLAIMED REQUEST ===');
    
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
    
    const { prNumber, repository, bountyAmount, projectId } = body;
    
    console.log('Parsed mark claimed request data:', {
      prNumber,
      repository,
      bountyAmount,
      projectId
    });

    if (!prNumber || !repository || !bountyAmount) {
      console.error('Missing required fields:', { prNumber, repository, bountyAmount });
      return NextResponse.json(
        { success: false, message: 'Missing required fields: prNumber, repository, and bountyAmount' },
        { status: 400 }
      );
    }
    
    // Validate data types
    if (typeof prNumber !== 'number' || typeof repository !== 'string' || typeof bountyAmount !== 'number') {
      console.error('Invalid data types:', { 
        prNumber: typeof prNumber, 
        repository: typeof repository,
        bountyAmount: typeof bountyAmount
      });
      return NextResponse.json(
        { success: false, message: 'Invalid data types: prNumber must be number, repository must be string, bountyAmount must be number' },
        { status: 400 }
      );
    }

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

    // Find the project by repository
    let project = null;
    
    try {
      // Look for project by repoUrl or name
      project = await prisma.project.findFirst({
        where: {
          OR: [
            { repoUrl: { contains: repository } },
            { name: { contains: repository } }
          ]
        },
        select: {
          id: true,
          name: true,
          repoUrl: true,
        }
      });
      
      if (project) {
        console.log('✅ Project found in database:', project);
      } else {
        console.log('⚠️ Project not found in database, creating new one...');
        
        // Create new project record
        let newProject;
        try {
          newProject = await prisma.project.create({
            data: {
              name: repository,
              description: `Auto-created project for repository ${repository}`,
              repoUrl: `https://github.com/${repository}`,
              lowestBounty: 0.01,
              highestBounty: 0.10,
              adminId: 1,
              updatedAt: new Date(),
            } as any
          });
        } catch (e: any) {
          const message = e?.message || '';
          if (message.includes('budget')) {
            const now = new Date();
            const insertSql = `
              INSERT INTO "Project" (
                "name", "description", "repoUrl", "adminId",
                "createdAt", "isActive", "maxContributors", "tags",
                "highestBounty", "lowestBounty", "updatedAt", "budget"
              ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11, $12
              ) RETURNING *
            `;
            const params = [
              repository,
              `Auto-created project for repository ${repository}`,
              `https://github.com/${repository}`,
              1,
              now,
              true,
              null,
              [],
              0.10,
              0.01,
              now,
              0.10
            ];
            const rows = await prisma.$queryRawUnsafe<any[]>(insertSql, ...params);
            const inserted = rows && rows[0];
            if (!inserted) throw e;
            newProject = inserted;
          } else {
            throw e;
          }
        }
        
        project = newProject;
        console.log('✅ New project created:', project);
      }
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to process project information' },
        { status: 500 }
      );
    }

    // Check if PR already exists
    let existingPR = null;
    
    try {
      // First try to find by projectId, prNumber, and developerId
      existingPR = await prisma.pullRequest.findFirst({
        where: {
          projectId: project.id,
          prNumber: prNumber,
          developerId: developerId
        }
      });
      
      if (existingPR) {
        console.log('✅ PR already exists in database for this developer:', existingPR.id);
        
        // Check if already claimed by this developer
        if (existingPR.bountyClaimed) {
          console.log('⚠️ PR already claimed by this developer');
          return NextResponse.json(
            { success: false, message: 'You have already claimed this PR' },
            { status: 409 }
          );
        }
      } else {
        console.log('⚠️ PR not found in database, creating new one...');
        
        // Create new PR record for this developer
        try {
          const newPR = await prisma.pullRequest.create({
            data: {
              prNumber: prNumber,
              title: `PR #${prNumber} from ${repository}`,
              description: `Auto-created PR record for ${repository}#${prNumber}`,
              additions: 0,
              deletions: 0,
              hasTests: false,
              linkedIssue: `https://github.com/${repository}/pull/${prNumber}`,
              merged: true, // Assume merged since bounty is being claimed
              score: 8.0, // Default score
              amountPaid: 0,
              developerId: developerId,
              projectId: project.id,
              bountyAmount: bountyAmount,
              bountyClaimed: false,
              updatedAt: new Date(),
            } as any
          });
          
          existingPR = newPR;
          console.log('✅ New PR created for this developer:', existingPR.id);
        } catch (createError) {
          console.error('Create failed, trying alternative approach:', createError);
          
          // Fallback: try to find any existing PR with this number across all projects
          const existingPRs = await prisma.pullRequest.findMany({
            where: {
              prNumber: prNumber,
              OR: [
                { linkedIssue: { contains: repository } },
                { title: { contains: repository } }
              ]
            }
          });
          
          if (existingPRs.length > 0) {
            console.log('✅ Found existing PR across projects:', existingPRs[0].id);
            existingPR = existingPRs[0];
            
            // Check if already claimed by THIS developer
            if (existingPR.bountyClaimed && (existingPR as any).bountyClaimedBy === developerId) {
              console.log('⚠️ PR already claimed by this developer');
              return NextResponse.json(
                { success: false, message: 'You have already claimed this PR' },
                { status: 409 }
              );
            }
            
            // If claimed by another developer, we can still create a new PR record for this developer
            if (existingPR.bountyClaimed && (existingPR as any).bountyClaimedBy !== developerId) {
              console.log('ℹ️ PR claimed by another developer, creating new record for this developer');
              existingPR = null; // Force creation of new PR record
            }
          } else {
            // Last resort: create with a different approach
            console.log('⚠️ Trying alternative PR creation method...');
            
            // Get the next available ID
            const lastPR = await prisma.pullRequest.findFirst({
              orderBy: { id: 'desc' }
            });
            
            const nextId = (lastPR?.id || 0) + 1;
            
            const newPR = await prisma.pullRequest.create({
              data: {
                id: nextId,
                prNumber: prNumber,
                title: `PR #${prNumber} from ${repository}`,
                description: `Auto-created PR record for ${repository}#${prNumber}`,
                additions: 0,
                deletions: 0,
                hasTests: false,
                linkedIssue: `https://github.com/${repository}/pull/${prNumber}`,
                merged: true,
                score: 8.0,
                amountPaid: 0,
                developerId: developerId,
                projectId: project.id,
                bountyAmount: bountyAmount,
                bountyClaimed: false,
                updatedAt: new Date(),
              } as any
            });
            
            existingPR = newPR;
            console.log('✅ New PR created with alternative method:', existingPR.id);
          }
        }
      }
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to process PR information' },
        { status: 500 }
      );
    }

    // Mark PR as claimed
    if (!existingPR) {
      console.error('No PR record available for claiming');
      return NextResponse.json(
        { success: false, message: 'Failed to create PR record for claiming' },
        { status: 500 }
      );
    }
    
    try {
      const updatedPR = await prisma.pullRequest.update({
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
      
      console.log('✅ PR marked as claimed successfully:', updatedPR.id);
      
      // Create payout record
      const payout = await prisma.payout.create({
        data: {
          id: `bounty-${project.id}-${prNumber}-${Date.now()}`,
          amount: bountyAmount,
          developerId: developerId,
          projectId: project.id,
          status: 'completed',
          transactionId: `bounty-${project.id}-${prNumber}-${Date.now()}`,
          updatedAt: new Date(),
        } as any
      });
      
      console.log('✅ Payout record created:', payout.id);
      
    } catch (error) {
      console.error('Database error updating PR:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to mark PR as claimed' },
        { status: 500 }
      );
    }

    console.log('=== PR MARKED AS CLAIMED SUCCESS ===');
    console.log(`✅ PR #${prNumber} marked as claimed successfully`);
    console.log(`💰 Amount: $${bountyAmount}`);
    console.log(`📁 Repository: ${repository}`);
    console.log(`👤 Developer: ${developerId}`);
    console.log(`📁 Project: ${project.name}`);

    return NextResponse.json({
      success: true,
      message: 'PR marked as claimed successfully',
      data: {
        prNumber,
        repository,
        bountyAmount,
        project: {
          id: project.id,
          name: project.name,
          repoUrl: project.repoUrl
        },
        developer: {
          id: developerId
        },
        claimedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('=== MARK PR AS CLAIMED ERROR ===');
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
    message: 'Mark PR as Claimed API is running',
    timestamp: new Date().toISOString()
  });
}
