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

async function processPushEvent(webhookData: unknown) {
  const { ref, before, after, repository, commits } = webhookData as { ref?: string; before?: string; after?: string; repository?: { full_name?: string }; commits?: unknown[] };
  
  // Process push to main/master branch
  if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
    return {
      type: 'push',
      branch: ref.replace('refs/heads/', ''),
      before,
      after,
      repository: repository?.full_name,
      commitCount: commits?.length || 0,
      commits: commits?.map((commit: unknown) => ({
        id: (commit as { id: string }).id,
        message: (commit as { message: string }).message,
        author: (commit as { author: { name: string } }).author.name,
        timestamp: (commit as { timestamp: string }).timestamp,
        url: (commit as { url: string }).url,
      })) || [],
      timestamp: new Date().toISOString(),
    };
  }
  
  return null;
}

async function processPullRequestEvent(webhookData: unknown) {
  const { action, pull_request, repository, sender } = webhookData as { action?: string; pull_request?: unknown; repository?: { full_name?: string }; sender?: { login?: string } };
  
  if (!pull_request) return null;

  const prData = {
    type: 'pull_request',
    action,
    repository: repository?.full_name,
    pullRequest: {
      id: (pull_request as { id: number }).id,
      number: (pull_request as { number: number }).number,
      title: (pull_request as { title: string }).title,
      body: (pull_request as { body?: string }).body,
      state: (pull_request as { state: string }).state,
      merged: (pull_request as { merged?: boolean }).merged,
      mergedAt: (pull_request as { merged_at?: string }).merged_at,
      closedAt: (pull_request as { closed_at?: string }).closed_at,
      author: (pull_request as { user: { login: string } }).user.login,
      headBranch: (pull_request as { head: { ref: string } }).head.ref,
      baseBranch: (pull_request as { base: { ref: string } }).base.ref,
      additions: (pull_request as { additions?: number }).additions,
      deletions: (pull_request as { deletions?: number }).deletions,
      changedFiles: (pull_request as { changed_files?: number }).changed_files,
      url: (pull_request as { html_url: string }).html_url,
      createdAt: (pull_request as { created_at: string }).created_at,
      updatedAt: (pull_request as { updated_at: string }).updated_at,
    },
    sender: sender?.login,
    timestamp: new Date().toISOString(),
  };

  // Special handling for merged PRs
  if (action === 'closed' && (pull_request as { merged?: boolean }).merged) {
    // TODO: Trigger payout calculation
    // await calculatePRPayout(prData);
  }

  return prData;
}

async function processIssueEvent(webhookData: unknown) {
  const { action, issue, repository, sender } = webhookData as { action?: string; issue?: unknown; repository?: { full_name?: string }; sender?: { login?: string } };
  
  return {
    type: 'issue',
    action,
    repository: repository?.full_name,
    issue: {
      id: (issue as { id?: number })?.id,
      number: (issue as { number?: number })?.number,
      title: (issue as { title?: string })?.title,
      state: (issue as { state?: string })?.state,
      author: (issue as { user?: { login?: string } })?.user?.login,
      url: (issue as { html_url?: string })?.html_url,
    },
    sender: sender?.login,
    timestamp: new Date().toISOString(),
  };
}

async function processCreateEvent(webhookData: unknown) {
  const { ref, ref_type, repository, sender } = webhookData as { ref?: string; ref_type?: string; repository?: { full_name?: string }; sender?: { login?: string } };
  
  return {
    type: 'create',
    refType: ref_type,
    ref,
    repository: repository?.full_name,
    sender: sender?.login,
    timestamp: new Date().toISOString(),
  };
}

async function processDeleteEvent(webhookData: unknown) {
  const { ref, ref_type, repository, sender } = webhookData as { ref?: string; ref_type?: string; repository?: { full_name?: string }; sender?: { login?: string } };
  
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
// function verifySignature(payload: unknown, signature: string, secret: string): boolean {
//   // TODO: Implement HMAC SHA256 verification
//   // const crypto = require('crypto');
//   // const expectedSignature = 'sha256=' + crypto
//   //   .createHmac('sha256', secret)
//   //   .update(JSON.stringify(payload))
//   //   .digest('hex');
//   // return crypto.timingSafeEqual(
//   //   Buffer.from(signature),
//   //   Buffer.from(expectedSignature)
//   // );
//   return true; // Placeholder
// }
