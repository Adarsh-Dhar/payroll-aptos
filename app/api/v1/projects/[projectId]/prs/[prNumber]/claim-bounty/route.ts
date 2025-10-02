import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; prNumber: string }> }
) {
  try {
    const { projectId, prNumber } = await params;
    const projectIdNum = parseInt(projectId);
    const prNumberNum = parseInt(prNumber);

    if (isNaN(projectIdNum) || isNaN(prNumberNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid project ID or PR number' },
        { status: 400 }
      );
    }

    // Get the PR with project details
    const pr = await prisma.pullRequest.findUnique({
      where: {
        projectId_prNumber: {
          projectId: projectIdNum,
          prNumber: prNumberNum
        }
      },
      include: {
        Project: {
          select: {
            id: true,
            name: true,
            repoUrl: true,
            lowestBounty: true,
            highestBounty: true,
          }
        },
        Developer: {
          select: {
            id: true,
            username: true,
            githubId: true,
          }
        }
      }
    });

    if (!pr) {
      return NextResponse.json(
        { success: false, message: 'Pull request not found' },
        { status: 404 }
      );
    }

    // Log repository information when claim reward button is pressed
    console.log('=== BOUNTY CLAIM REQUEST ===');
    console.log(`PR ${prNumber} belongs to repository: ${pr.Project.repoUrl}`);
    console.log(`Project ID: ${pr.Project.id}`);
    console.log(`Project Name: ${pr.Project.name}`);
    
    // Get all projects and their repositories from the database
    console.log('=== ALL PROJECT REPOSITORIES ===');
    const allProjects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        repoUrl: true,
        lowestBounty: true,
        highestBounty: true,
      }
    });
    
    allProjects.forEach(project => {
      console.log(`Project ID: ${project.id}, Name: ${project.name}, Repo: ${project.repoUrl}, Bounty Range: $${project.lowestBounty} - $${project.highestBounty}`);
    });
    
    // Check if the current PR's repository matches any project repository
    const matchingProject = allProjects.find(project => 
      project.repoUrl === pr.Project.repoUrl
    );
    
    if (matchingProject) {
      console.log(`✅ Repository ${pr.Project.repoUrl} is registered in project: ${matchingProject.name}`);
    } else {
      console.log(`❌ Repository ${pr.Project.repoUrl} is NOT registered in any project`);
      console.log('Available repositories:');
      allProjects.forEach(project => {
        console.log(`  - ${project.repoUrl}`);
      });
    }

    // Check if PR is merged
    if (!pr.merged) {
      return NextResponse.json(
        { success: false, message: 'Only merged PRs can claim bounties' },
        { status: 400 }
      );
    }

    // Check if bounty is already claimed
    if (pr.bountyClaimed) {
      return NextResponse.json(
        { success: false, message: 'Bounty already claimed for this PR' },
        { status: 400 }
      );
    }

    // Calculate bounty amount using the formula: L + (D * x / 10)
    // where L = lowest bounty, D = difference between highest and lowest, x = score
    const lowestBounty = pr.Project.lowestBounty;
    const highestBounty = pr.Project.highestBounty;
    const difference = highestBounty - lowestBounty;
    const score = pr.score;
    
    const bountyAmount = lowestBounty + (difference * score / 10);
    
    // Log bounty calculation details
    console.log('=== BOUNTY CALCULATION ===');
    console.log(`PR Score: ${score}`);
    console.log(`Lowest Bounty (L): $${lowestBounty}`);
    console.log(`Highest Bounty: $${highestBounty}`);
    console.log(`Difference (D): $${difference}`);
    console.log(`Bounty Formula: L + (D × x / 10) = ${lowestBounty} + (${difference} × ${score} / 10)`);
    console.log(`Calculated Bounty: $${bountyAmount}`);

    // Update the PR with bounty information
    const updatedPR = await prisma.pullRequest.update({
      where: {
        projectId_prNumber: {
          projectId: projectIdNum,
          prNumber: prNumberNum
        }
      },
      data: {
        bountyAmount: bountyAmount,
        bountyClaimed: true,
        bountyClaimedAt: new Date(),
        amountPaid: bountyAmount, // Also update the amountPaid field
      },
      include: {
        Project: {
          select: {
            id: true,
            name: true,
            lowestBounty: true,
            highestBounty: true,
          }
        },
        Developer: {
          select: {
            id: true,
            username: true,
            githubId: true,
          }
        }
      }
    });

    // Create a payout record
    const payout = await prisma.payout.create({
      data: {
        id: `bounty-${projectIdNum}-${prNumberNum}-${Date.now()}`,
        amount: bountyAmount,
        developerId: pr.developerId,
        projectId: projectIdNum,
        status: 'completed',
        transactionId: `bounty-${projectIdNum}-${prNumberNum}-${Date.now()}`,
        updatedAt: new Date(),
      },
      include: {
        Developer: {
          select: {
            id: true,
            username: true,
            githubId: true,
          }
        },
        Project: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Log successful bounty claim
    console.log('=== BOUNTY CLAIM SUCCESS ===');
    console.log(`✅ Bounty claimed successfully for PR ${prNumber}`);
    console.log(`💰 Amount: $${bountyAmount}`);
    console.log(`👤 Developer: ${payout.Developer.username}`);
    console.log(`📁 Project: ${payout.Project.name}`);
    
    return NextResponse.json({
      success: true,
      message: 'Bounty claimed successfully',
      data: {
        pr: updatedPR,
        payout: payout,
        bountyCalculation: {
          lowestBounty,
          highestBounty,
          difference,
          score,
          calculatedBounty: bountyAmount,
          formula: `L + (D × x / 10) = ${lowestBounty} + (${difference} × ${score} / 10) = ${bountyAmount}`
        }
      }
    });

  } catch (error) {
    console.error('=== BOUNTY CLAIM ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {}
}
