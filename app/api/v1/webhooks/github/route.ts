import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const githubWebhookSchema = z.object({
  ref: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    html_url: z.string(),
    clone_url: z.string(),
  }).optional(),
  commits: z.array(z.object({
    id: z.string(),
    message: z.string(),
    timestamp: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string(),
    }),
    url: z.string(),
  })).optional(),
  pull_request: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().optional(),
    state: z.string(),
    merged: z.boolean().optional(),
    merged_at: z.string().optional(),
    closed_at: z.string().optional(),
    user: z.object({
      login: z.string(),
      id: z.number(),
      avatar_url: z.string(),
    }),
    head: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
    base: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
    additions: z.number().optional(),
    deletions: z.number().optional(),
    changed_files: z.number().optional(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  }).optional(),
  action: z.string().optional(), // opened, closed, reopened, etc.
  sender: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement GitHub webhook signature verification
    // const signature = request.headers.get('x-hub-signature-256');
    // if (!verifySignature(request.body, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const body = await request.json();
    const webhookData = githubWebhookSchema.parse(body);

    // Determine the type of webhook event
    const eventType = request.headers.get('x-github-event');
    
    if (!eventType) {
      return NextResponse.json(
        { success: false, message: 'Missing GitHub event type' },
        { status: 400 }
      );
    }

    let processedData = null;

    switch (eventType) {
      case 'push':
        processedData = await processPushEvent(webhookData);
        break;
      
      case 'pull_request':
        processedData = await processPullRequestEvent(webhookData);
        break;
      
      case 'issues':
        processedData = await processIssueEvent(webhookData);
        break;
      
      case 'create':
        processedData = await processCreateEvent(webhookData);
        break;
      
      case 'delete':
        processedData = await processDeleteEvent(webhookData);
        break;
      
      default:
        return NextResponse.json({
          success: true,
          message: `Event type '${eventType}' not processed`,
          eventType
        });
    }

    // TODO: Store processed data in your database
    // await storeWebhookData(processedData);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${eventType} event`,
      eventType,
      data: processedData
    });

  } catch (error) {
    console.error('GitHub webhook processing error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid webhook payload', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processPushEvent(webhookData: any) {
  const { ref, before, after, repository, commits } = webhookData;
  
  // Process push to main/master branch
  if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
    return {
      type: 'push',
      branch: ref.replace('refs/heads/', ''),
      before,
      after,
      repository: repository?.full_name,
      commitCount: commits?.length || 0,
      commits: commits?.map((commit: any) => ({
        id: commit.id,
        message: commit.message,
        author: commit.author.name,
        timestamp: commit.timestamp,
        url: commit.url,
      })) || [],
      timestamp: new Date().toISOString(),
    };
  }
  
  return null;
}

async function processPullRequestEvent(webhookData: any) {
  const { action, pull_request, repository, sender } = webhookData;
  
  if (!pull_request) return null;

  const prData = {
    type: 'pull_request',
    action,
    repository: repository?.full_name,
    pullRequest: {
      id: pull_request.id,
      number: pull_request.number,
      title: pull_request.title,
      body: pull_request.body,
      state: pull_request.state,
      merged: pull_request.merged,
      mergedAt: pull_request.merged_at,
      closedAt: pull_request.closed_at,
      author: pull_request.user.login,
      headBranch: pull_request.head.ref,
      baseBranch: pull_request.base.ref,
      additions: pull_request.additions,
      deletions: pull_request.deletions,
      changedFiles: pull_request.changed_files,
      url: pull_request.html_url,
      createdAt: pull_request.created_at,
      updatedAt: pull_request.updated_at,
    },
    sender: sender?.login,
    timestamp: new Date().toISOString(),
  };

  // Special handling for merged PRs
  if (action === 'closed' && pull_request.merged) {
    // TODO: Trigger payout calculation
    // await calculatePRPayout(prData);
  }

  return prData;
}

async function processIssueEvent(webhookData: any) {
  const { action, issue, repository, sender } = webhookData;
  
  return {
    type: 'issue',
    action,
    repository: repository?.full_name,
    issue: {
      id: issue?.id,
      number: issue?.number,
      title: issue?.title,
      state: issue?.state,
      author: issue?.user?.login,
      url: issue?.html_url,
    },
    sender: sender?.login,
    timestamp: new Date().toISOString(),
  };
}

async function processCreateEvent(webhookData: any) {
  const { ref, ref_type, repository, sender } = webhookData;
  
  return {
    type: 'create',
    refType: ref_type,
    ref,
    repository: repository?.full_name,
    sender: sender?.login,
    timestamp: new Date().toISOString(),
  };
}

async function processDeleteEvent(webhookData: any) {
  const { ref, ref_type, repository, sender } = webhookData;
  
  return {
    type: 'delete',
    refType: ref_type,
    ref,
    repository: repository?.full_name,
    sender: sender?.login,
    timestamp: new Date().toISOString(),
  };
}

// Helper function to verify GitHub webhook signature
function verifySignature(payload: any, signature: string, secret: string): boolean {
  // TODO: Implement HMAC SHA256 verification
  // const crypto = require('crypto');
  // const expectedSignature = 'sha256=' + crypto
  //   .createHmac('sha256', secret)
  //   .update(JSON.stringify(payload))
  //   .digest('hex');
  // return crypto.timingSafeEqual(
  //   Buffer.from(signature),
  //   Buffer.from(expectedSignature)
  // );
  return true; // Placeholder
}
