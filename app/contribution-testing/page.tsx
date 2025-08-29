"use client";

import { useState } from "react";

type GitHubPR = unknown;
type GitHubFile = unknown;
type GitHubCommit = unknown;

export default function ContributionTestingPage() {
  const [prUrl, setPrUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponseJson(null);
    try {
      const baseUrl = `/api/agents/github/contribution`;
      console.log('Submitting PR URL:', prUrl);
      const r = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ prUrl, githubToken }),
      });
      if (!r.ok) {
        let detail = '';
        try {
          const body = await r.json();
          detail = body?.error || body?.message || '';
        } catch {}
        throw new Error(`${r.status} ${r.statusText}${detail ? ` - ${detail}` : ''}`);
      }
      const data = await r.json();
      console.log("/api/agents/github/contribution response:", data);
      setResponseJson(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] w-full px-6 py-8 md:px-10 md:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">PR Categorization Tester</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a GitHub PR URL and a GitHub access token; we will POST to the
          API and log the response.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">GitHub PR URL</label>
            <input
              type="url"
              required
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">GitHub Token</label>
            <input
              type="password"
              required
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Token must have permissions to read PRs on that repository.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Posting..." : "Send Request"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPrUrl("");
                setGithubToken("");
                setResponseJson(null);
                setError(null);
              }}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
            >
              Reset
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {responseJson !== null && typeof responseJson === 'object' && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-foreground">Response</h2>
            <pre className="overflow-auto rounded-md border border-border bg-muted p-4 text-xs leading-relaxed text-foreground">
{JSON.stringify(responseJson, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}


