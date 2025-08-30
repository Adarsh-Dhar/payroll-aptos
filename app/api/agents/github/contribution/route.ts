import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PR_CATEGORIZATION_PROMPT } from './prompt';

// GitHub API types
interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  head: {
    sha: string;
  };
  base: {
    sha: string;
  };
}

interface GitHubFile {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
  patch?: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface PRAnalysis {
  category: 'easy' | 'medium' | 'hard';
  final_score: number;
  metric_scores: {
    code_size: number;
    review_cycles: number;
    review_time: number;
    first_review_wait: number;
    review_depth: number;
    code_quality: number;
  };
  reasoning: string;
  key_insights: {
    complexity_indicators: string;
    quality_indicators: string;
    timeline_analysis: string;
    risk_assessment: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== GITHUB CONTRIBUTION API REQUEST ===');
    
    const body = await req.json();
    console.log('Request body:', body);
    
    const { prUrl, repoUrl, owner: bodyOwner, repo: bodyRepo, prNumber: bodyPrNumber, githubToken } = body;

    // Accept either explicit owner/repo/prNumber or a prUrl (preferred) and optional repoUrl
    let owner = bodyOwner as string | undefined;
    let repo = bodyRepo as string | undefined;
    let prNumber = bodyPrNumber as number | string | undefined;

    console.log('Initial values:', { owner, repo, prNumber, prUrl, repoUrl });

    if (typeof prUrl === 'string' && prUrl.length > 0) {
      console.log('Parsing PR URL:', prUrl);
      try {
        const parsed = parsePrUrl(prUrl);
        owner = parsed.owner;
        repo = parsed.repo;
        prNumber = parsed.prNumber;
        console.log('Parsed from PR URL:', { owner, repo, prNumber });
      } catch (error) {
        console.error('Failed to parse PR URL:', error);
        return NextResponse.json(
          { error: `Failed to parse PR URL: ${error}` },
          { status: 400 }
        );
      }
    }

    if ((!owner || !repo || !prNumber) && typeof repoUrl === 'string' && repoUrl.length > 0) {
      console.log('Parsing repo URL:', repoUrl);
      try {
        const parsedRepo = parseRepoUrl(repoUrl);
        owner ||= parsedRepo.owner;
        repo ||= parsedRepo.repo;
        console.log('Parsed from repo URL:', { owner, repo });
      } catch (error) {
        console.error('Failed to parse repo URL:', error);
        return NextResponse.json(
          { error: `Failed to parse repo URL: ${error}` },
          { status: 400 }
        );
      }
    }

    console.log('Final parsed values:', { owner, repo, prNumber });

    // Validate required fields
    if (!owner || !repo || !prNumber || !githubToken) {
      console.error('Missing required fields:', { owner, repo, prNumber, hasToken: !!githubToken });
      return NextResponse.json(
        { error: 'Missing required fields: provide prUrl (recommended) or owner, repo, prNumber, and githubToken' },
        { status: 400 }
      );
    }

    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    console.log('Parsed values:', { owner, repo, prNumber, baseUrl });
    const authScheme = (typeof githubToken === 'string' && githubToken.startsWith('ghp_')) ? 'token' : 'Bearer';
    const headers = {
      'Authorization': `${authScheme} ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'PR-Categorization-Bot',
      'X-GitHub-Api-Version': '2022-11-28'
    } as Record<string, string>;

    // First check if repository exists
    console.log('Checking repository access...');
    const repoCheckUrl = `https://api.github.com/repos/${owner}/${repo}`;
    console.log('Repository check URL:', repoCheckUrl);
    
    try {
      const repoResponse = await fetch(repoCheckUrl, { headers });
      console.log('Repository check response status:', repoResponse.status);
      
      if (!repoResponse.ok) {
        if (repoResponse.status === 404) {
          const error = `Repository not found: ${owner}/${repo}. Please check the repository name and ensure it exists on GitHub.`;
          console.error(error);
          return NextResponse.json({ error }, { status: 404 });
        }
        const error = `Failed to access repository: ${repoResponse.status} ${repoResponse.statusText}`;
        console.error(error);
        return NextResponse.json({ error }, { status: repoResponse.status });
      }
      console.log('✅ Repository access confirmed');
    } catch (error) {
      console.error('Repository check failed:', error);
      return NextResponse.json(
        { error: `Repository check failed: ${error}` },
        { status: 500 }
      );
    }

    // Fetch PR details
    console.log('Fetching PR details...');
    console.log('PR URL:', baseUrl);
    
    let prData: GitHubPR;
    try {
      const prResponse = await fetch(baseUrl, { headers });
      console.log('PR response status:', prResponse.status);
      
      if (!prResponse.ok) {
        let detail = '';
        try {
          const body = await prResponse.json();
          detail = body?.message ? ` - ${body.message}` : '';
        } catch {}
        const error = `GitHub API error: ${prResponse.status} ${prResponse.statusText}${detail}`;
        console.error('GitHub API failed:', { status: prResponse.status, statusText: prResponse.statusText, detail, url: baseUrl });
        return NextResponse.json({ error }, { status: prResponse.status });
      }
      
      prData = await prResponse.json();
      console.log('✅ PR details fetched successfully');
      console.log('PR data:', { 
        id: prData.id, 
        number: prData.number, 
        title: prData.title,
        state: prData.state,
        additions: prData.additions,
        deletions: prData.deletions
      });
    } catch (error) {
      console.error('PR fetch failed:', error);
      return NextResponse.json(
        { error: `Failed to fetch PR: ${error}` },
        { status: 500 }
      );
    }

    // Fetch PR files
    const filesResponse = await fetch(`${baseUrl}/files`, { headers });
    if (!filesResponse.ok) {
      throw new Error(`Failed to fetch PR files: ${filesResponse.status}`);
    }
    const filesData: GitHubFile[] = await filesResponse.json();

    // Fetch PR commits
    const commitsResponse = await fetch(`${baseUrl}/commits`, { headers });
    if (!commitsResponse.ok) {
      throw new Error(`Failed to fetch PR commits: ${commitsResponse.status}`);
    }
    const commitsData: GitHubCommit[] = await commitsResponse.json();

    // Fetch PR reviews for scoring metrics
    const reviewsResponse = await fetch(`${baseUrl}/reviews`, { headers });
    let reviewsData = [];
    if (reviewsResponse.ok) {
      reviewsData = await reviewsResponse.json();
    }

    // Fetch review comments for depth analysis
    const reviewCommentsResponse = await fetch(`${baseUrl}/comments`, { headers });
    let reviewCommentsData = [];
    if (reviewCommentsResponse.ok) {
      reviewCommentsData = await reviewCommentsResponse.json();
    }

    // Fetch issue comments if this PR references an issue
    let issueCommentsData: any[] = [];
    // if (issueData) {
    //   const issueNumber = issueData.number;
    //   const issueCommentsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, { headers });
    //   if (issueCommentsResponse.ok) {
    //     issueCommentsData = await issueCommentsResponse.json();
    //   }
    // }

    // Fetch CI status checks
    const statusResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/statuses/${prData.head.sha}`, { headers });
    let statusData = [];
    if (statusResponse.ok) {
      statusData = await statusResponse.json();
    }

    // Fetch check runs (GitHub Actions, etc.)
    const checkRunsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${prData.head.sha}/check-runs`, { headers });
    let checkRunsData = { check_runs: [] };
    if (checkRunsResponse.ok) {
      checkRunsData = await checkRunsResponse.json();
    }

    // Fetch linked issue if referenced in PR body or title
    let issueData = null;
    const issueMatch = prData.body?.match(/#(\d+)|issues\/(\d+)|fix\s+#(\d+)|closes?\s+#(\d+)|resolves?\s+#(\d+)/i);
    if (issueMatch) {
      const issueNumber = issueMatch[1] || issueMatch[2] || issueMatch[3] || issueMatch[4] || issueMatch[5];
      try {
        const issueResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, { headers });
        if (issueResponse.ok) {
          issueData = await issueResponse.json();
        }
      } catch (error) {
        console.log('Failed to fetch linked issue, continuing without it');
      }
    }

    // Prepare data for metric computation
    const prAnalysisData = {
      pr: {
        title: prData.title,
        description: prData.body || '',
        author: prData.user.login,
        stats: {
          additions: prData.additions,
          deletions: prData.deletions,
          changedFiles: prData.changed_files,
          commits: prData.commits
        },
        timeline: {
          created: prData.created_at,
          updated: prData.updated_at,
          merged: prData.merged_at
        },
        state: prData.state
      },
      issue: issueData ? {
        title: issueData.title,
        body: issueData.body,
        labels: issueData.labels?.map((label: any) => label.name) || [],
        comments_count: issueData.comments || 0
      } : null,
      files: filesData.map(file => ({
        filename: file.filename,
        changes: file.changes,
        additions: file.additions,
        deletions: file.deletions,
        status: file.status,
        // Determine file type for scoring
        type: getFileType(file.filename),
        // Include patch for smaller files to analyze code quality
        patch: file.changes < 100 ? file.patch : undefined
      })),
      commits: commitsData.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date
      })),
      reviews: reviewsData.map((review: any) => ({
        id: review.id,
        user: review.user.login,
        state: review.state, // APPROVED, REQUEST_CHANGES, COMMENTED
        submitted_at: review.submitted_at,
        body: review.body
      })),
      review_comments: reviewCommentsData.map((comment: any) => ({
        id: comment.id,
        user: comment.user.login,
        body: comment.body,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        path: comment.path,
        line: comment.line
      })),
      ci_status: {
        statuses: statusData.map((status: any) => ({
          state: status.state, // success, failure, pending, error
          context: status.context,
          description: status.description,
          created_at: status.created_at
        })),
        check_runs: checkRunsData.check_runs.map((run: any) => ({
          name: run.name,
          status: run.status, // completed, in_progress, queued
          conclusion: run.conclusion, // success, failure, cancelled, neutral, skipped
          started_at: run.started_at,
          completed_at: run.completed_at
        }))
      },
      metrics: {
        // Calculate some basic metrics for the AI
        total_comments: reviewCommentsData.length,
        review_count: reviewsData.length,
        approval_count: reviewsData.filter((r: any) => r.state === 'APPROVED').length,
        change_request_count: reviewsData.filter((r: any) => r.state === 'CHANGES_REQUESTED').length,
        // Time calculations
        time_to_first_review: reviewsData.length > 0 ? 
          new Date(reviewsData[0].submitted_at).getTime() - new Date(prData.created_at).getTime() : null,
        total_review_time: prData.merged_at ? 
          new Date(prData.merged_at).getTime() - new Date(prData.created_at).getTime() : null,
        // File type breakdown
        file_types: getFileTypeBreakdown(filesData)
      }
    };

    // Compute metric scores (1-10 each)
    const metricScores = computeMetricScores({
      pr: prData,
      commits: commitsData,
      reviews: reviewsData,
      reviewComments: reviewCommentsData,
      issueComments: issueCommentsData,
      files: filesData,
      statuses: statusData,
      checkRuns: checkRunsData.check_runs
    });

    const finalScore = Number((
      metricScores.code_size * 0.20 +
      metricScores.review_cycles * 0.15 +
      metricScores.review_time * 0.20 +
      metricScores.first_review_wait * 0.15 +
      metricScores.review_depth * 0.15 +
      metricScores.code_quality * 0.15
    ).toFixed(1));

    const category: PRAnalysis['category'] = finalScore < 4 ? 'easy' : finalScore < 7 ? 'medium' : 'hard';

    // Try LLM-based derivation first if API key is present
    let llmAnalysis: PRAnalysis | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const llmInput = {
          github: prAnalysisData,
          local_metric_scores: metricScores,
          local_final_score: finalScore,
          weights: {
            code_size: 0.20,
            review_cycles: 0.15,
            review_time: 0.20,
            first_review_wait: 0.15,
            review_depth: 0.15,
            code_quality: 0.15
          }
        };
        const prompt = `${PR_CATEGORIZATION_PROMPT}\n\nGitHub PR data and preliminary metrics (JSON):\n${JSON.stringify(llmInput, null, 2)}\n`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        // Basic shape validation
        if (
          parsed && typeof parsed === 'object' && parsed.metric_scores && typeof parsed.final_score === 'number' && parsed.category
        ) {
          llmAnalysis = parsed as PRAnalysis;
        }
      } catch (e) {
        // Fallback to local computation
        llmAnalysis = null;
      }
    }

    const analysis: PRAnalysis = llmAnalysis || {
      category,
      final_score: finalScore,
      metric_scores: metricScores,
      reasoning: buildReasoning(metricScores, prAnalysisData),
      key_insights: buildInsights(metricScores, prAnalysisData)
    };

    return NextResponse.json({
      success: true,
      pr_number: prNumber,
      analysis,
      metadata: {
        analyzed_at: new Date().toISOString(),
        pr_stats: prAnalysisData.pr.stats,
        has_linked_issue: !!issueData,
        used_llm: !!llmAnalysis
      }
    });

  } catch (error) {
    console.error('PR Analysis Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze PR', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET method for health check
export async function GET() {
  return NextResponse.json({
    message: 'GitHub PR Categorization API is running',
    timestamp: new Date().toISOString()
  });
}

// ===== Helpers =====

function parsePrUrl(url: string): { owner: string; repo: string; prNumber: string } {
  // Examples: https://github.com/owner/repo/pull/123 or /pulls/123
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const pullIndex = parts.findIndex(p => p === 'pull' || p === 'pulls');
    if (pullIndex >= 2 && parts[pullIndex + 1]) {
      return { owner: parts[0], repo: parts[1], prNumber: parts[pullIndex + 1] };
    }
  } catch (_) {
    // Fallback simple parse
    const parts = url.split('/').filter(Boolean);
    const pullIndex = parts.findIndex(p => p === 'pull' || p === 'pulls');
    if (pullIndex >= 2 && parts[pullIndex + 1]) {
      return { owner: parts[pullIndex - 2], repo: parts[pullIndex - 1], prNumber: parts[pullIndex + 1] };
    }
  }
  throw new Error('Invalid PR URL');
}

function parseRepoUrl(url: string): { owner: string; repo: string } {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  } catch (_) {
    const parts = url.split('/').filter(Boolean);
    const idx = parts.findIndex(p => p.includes('github.com'));
    if (idx >= 0 && parts[idx + 1] && parts[idx + 2]) return { owner: parts[idx + 1], repo: parts[idx + 2] };
  }
  throw new Error('Invalid repo URL');
}

function isBotUser(login: string | undefined): boolean {
  if (!login) return false;
  return login.endsWith('[bot]') || login.toLowerCase().includes('bot');
}

function scaleLinear(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  const ratio = (value - inMin) / (inMax - inMin);
  return outMin + ratio * (outMax - outMin);
}

function getFileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  const configExtensions = ['json', 'yml', 'yaml', 'toml', 'ini', 'env', 'config'];
  const testExtensions = ['test', 'spec'];
  const docExtensions = ['md', 'rst', 'txt', 'doc'];
  if (testExtensions.some(ext => filename.includes(`.${ext}.`) || filename.includes(`_${ext}.`))) return 'test';
  if (configExtensions.includes(extension || '')) return 'config';
  if (docExtensions.includes(extension || '')) return 'documentation';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'rs'].includes(extension || '')) return 'code';
  return 'other';
}

function getFileTypeBreakdown(files: GitHubFile[]) {
  const breakdown = { code: 0, test: 0, config: 0, documentation: 0, other: 0 } as Record<string, number>;
  files.forEach(file => {
    const type = getFileType(file.filename);
    breakdown[type] = (breakdown[type] || 0) + 1;
  });
  return breakdown;
}

function computeMetricScores(input: {
  pr: GitHubPR;
  commits: GitHubCommit[];
  reviews: any[];
  reviewComments: any[];
  issueComments: any[];
  files: GitHubFile[];
  statuses: any[];
  checkRuns: any[];
}): PRAnalysis['metric_scores'] {
  const { pr, reviews, reviewComments, issueComments, files, statuses, checkRuns } = input;

  // Code size score (meaningful diff)
  const totalLines = (pr.additions || 0) + (pr.deletions || 0);
  const breakdown = getFileTypeBreakdown(files);
  const nonMeaningful = (breakdown.documentation || 0) + (breakdown.config || 0);
  const meaningfulFactor = Math.max(0.5, 1 - nonMeaningful / Math.max(1, files.length));
  const effectiveLines = totalLines * meaningfulFactor;
  let codeSizeScore = 0;
  if (effectiveLines < 50 && pr.changed_files <= 2) {
    codeSizeScore = scaleLinear(effectiveLines, 0, 50, 1, 3);
  } else if (effectiveLines <= 300 && pr.changed_files <= 10) {
    codeSizeScore = scaleLinear(effectiveLines, 50, 300, 4, 7);
  } else {
    codeSizeScore = Math.min(10, scaleLinear(effectiveLines, 300, 1500, 8, 10));
  }

  // Review cycles (fewer is better)
  const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
  const approvals = reviews.filter(r => r.state === 'APPROVED').length;
  const reviewCyclesApprox = Math.max(1, changesRequested + (approvals > 0 ? 1 : 0));
  let reviewCyclesScore = 0;
  if (reviewCyclesApprox <= 2) reviewCyclesScore = 9;
  else if (reviewCyclesApprox <= 5) reviewCyclesScore = 6;
  else reviewCyclesScore = 2;

  // Review time (faster is better)
  const createdAt = new Date(pr.created_at).getTime();
  const mergedOrNow = new Date(pr.merged_at || pr.updated_at || new Date().toISOString()).getTime();
  const reviewMs = Math.max(0, mergedOrNow - createdAt);
  const oneDay = 24 * 3600 * 1000;
  let reviewTimeScore = 0;
  if (reviewMs < oneDay) reviewTimeScore = 9;
  else if (reviewMs <= 7 * oneDay) reviewTimeScore = 6;
  else reviewTimeScore = 2;

  // First review wait (shorter is better)
  const humanReviews = reviews.filter(r => !isBotUser(r.user?.login)).sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
  const firstReviewAt = humanReviews[0]?.submitted_at ? new Date(humanReviews[0].submitted_at).getTime() : null;
  let firstReviewWaitScore = 5;
  if (firstReviewAt) {
    const waitMs = Math.max(0, firstReviewAt - createdAt);
    if (waitMs < 4 * 3600 * 1000) firstReviewWaitScore = 9;
    else if (waitMs <= oneDay) firstReviewWaitScore = 6;
    else firstReviewWaitScore = 2;
  }

  // Review depth/comments (balanced engagement)
  const totalReviewComments = (reviewComments?.length || 0) + (issueComments?.length || 0);
  let reviewDepthScore = 6;
  if (totalReviewComments <= 3 && approvals > 0 && changesRequested === 0) reviewDepthScore = 9;
  else if (totalReviewComments > 15 || changesRequested > 1) reviewDepthScore = 3;

  // Code quality / bot presence (CI, bots, tests)
  const anyFailedStatus = (statuses || []).some((s: any) => ['failure', 'error'].includes((s.state || '').toLowerCase()));
  const anyFailedCheck = (checkRuns || []).some((r: any) => ['failure', 'timed_out', 'cancelled'].includes((r.conclusion || '').toLowerCase()));
  const botComments = (reviewComments || []).filter((c: any) => isBotUser(c.user?.login)).length;
  let codeQualityScore = 6;
  if (!anyFailedStatus && !anyFailedCheck && botComments <= 2) codeQualityScore = 9;
  else if (anyFailedStatus || anyFailedCheck) codeQualityScore = 3;

  return {
    code_size: round1(codeSizeScore),
    review_cycles: round1(reviewCyclesScore),
    review_time: round1(reviewTimeScore),
    first_review_wait: round1(firstReviewWaitScore),
    review_depth: round1(reviewDepthScore),
    code_quality: round1(codeQualityScore)
  };
}

function round1(n: number): number {
  return Number(n.toFixed(1));
}

function buildReasoning(metrics: PRAnalysis['metric_scores'], data: any): string {
  const parts: string[] = [];
  parts.push(`Code size: ${metrics.code_size}/10 with ${data.pr.stats.additions}+ additions and ${data.pr.stats.deletions}- deletions across ${data.pr.stats.changedFiles} files.`);
  parts.push(`Review cycles: ${metrics.review_cycles}/10 based on review outcomes and iterations.`);
  parts.push(`Review time: ${metrics.review_time}/10 from creation to merge/update.`);
  parts.push(`First review wait: ${metrics.first_review_wait}/10 based on time to first human review.`);
  parts.push(`Review depth: ${metrics.review_depth}/10 from total review and issue comments.`);
  parts.push(`Code quality: ${metrics.code_quality}/10 using CI statuses/check runs and bot activity.`);
  return parts.join(' ');
}

function buildInsights(metrics: PRAnalysis['metric_scores'], data: any): PRAnalysis['key_insights'] {
  return {
    complexity_indicators: `Effective lines changed and file type breakdown suggest ${(metrics.code_size >= 7) ? 'broad' : (metrics.code_size <= 3 ? 'small' : 'moderate')} scope.`,
    quality_indicators: `CI ${(metrics.code_quality >= 8) ? 'passed cleanly' : (metrics.code_quality <= 4 ? 'had failures' : 'had minor issues')}; bot feedback ${(metrics.code_quality >= 8) ? 'minimal' : 'present'}.`,
    timeline_analysis: `Total review time and first review wait indicate ${(metrics.review_time >= 8 && metrics.first_review_wait >= 8) ? 'swift' : (metrics.review_time <= 4 ? 'prolonged' : 'typical')} process.`,
    risk_assessment: `${(metrics.review_cycles <= 4 && metrics.code_quality >= 8) ? 'Low' : (metrics.review_cycles <= 6 ? 'Medium' : 'High')} risk based on iterations and CI results.`
  };
}