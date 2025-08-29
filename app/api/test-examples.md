# API Test Examples

This file contains practical examples of how to test and use the DevPayStream API endpoints.

## Authentication

### 1. Admin Login
```bash
curl -X POST "http://localhost:3000/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@devpaystream.com",
    "password": "admin123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "mock-jwt-123456789",
  "user": {
    "id": "admin-1",
    "email": "admin@devpaystream.com",
    "role": "admin",
    "name": "Admin User"
  }
}
```

## Projects

### 2. List Projects
```bash
curl -X GET "http://localhost:3000/api/v1/projects?page=1&limit=10" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

### 3. Create Project
```bash
curl -X POST "http://localhost:3000/api/v1/projects" \
  -H "Authorization: Bearer mock-jwt-123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New API Project",
    "description": "Building a new API service",
    "githubUrl": "https://github.com/org/new-api",
    "budget": 8000,
    "active": true
  }'
```

### 4. Get Project Details
```bash
curl -X GET "http://localhost:3000/api/v1/projects/1" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

### 5. Update Project
```bash
curl -X PUT "http://localhost:3000/api/v1/projects/1" \
  -H "Authorization: Bearer mock-jwt-123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 12000,
    "description": "Updated project description"
  }'
```

## Developers

### 6. List Developers
```bash
curl -X GET "http://localhost:3000/api/v1/developers?page=1&limit=20&search=alice" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

### 7. Register Developer
```bash
curl -X POST "http://localhost:3000/api/v1/developers" \
  -H "Content-Type: application/json" \
  -d '{
    "githubUsername": "new-dev",
    "email": "newdev@example.com",
    "name": "New Developer",
    "avatarUrl": "https://github.com/new-dev.png"
  }'
```

### 8. Get Developer Profile
```bash
curl -X GET "http://localhost:3000/api/v1/developers/1" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

## Pull Requests

### 9. List Project PRs
```bash
curl -X GET "http://localhost:3000/api/v1/projects/1/prs?state=merged&page=1&limit=10" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

### 10. Create PR
```bash
curl -X POST "http://localhost:3000/api/v1/projects/1/prs" \
  -H "Authorization: Bearer mock-jwt-123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "number": 44,
    "title": "Add user authentication",
    "description": "Implements JWT-based user authentication",
    "author": "alice-dev",
    "githubUrl": "https://github.com/devpaystream/core/pull/44",
    "state": "open",
    "baseBranch": "main",
    "headBranch": "feature/auth",
    "additions": 200,
    "deletions": 15,
    "changedFiles": 8
  }'
```

### 11. Get PR Details
```bash
curl -X GET "http://localhost:3000/api/v1/projects/1/prs/42" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

### 12. Update PR
```bash
curl -X PATCH "http://localhost:3000/api/v1/projects/1/prs/42" \
  -H "Authorization: Bearer mock-jwt-123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "merged",
    "reviewScore": 9.5,
    "mergeDate": "2024-01-15T10:30:00.000Z"
  }'
```

## Payouts

### 13. List Project Payouts
```bash
curl -X GET "http://localhost:3000/api/v1/projects/1/payouts?status=completed&page=1&limit=20" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

### 14. Create Payout
```bash
curl -X POST "http://localhost:3000/api/v1/projects/1/payouts" \
  -H "Authorization: Bearer mock-jwt-123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "developerId": "1",
    "amount": 200,
    "description": "Payment for PR #44 - Add user authentication",
    "type": "pr_reward",
    "status": "pending",
    "reference": "PR #44"
  }'
```

### 15. Get Developer Payouts
```bash
curl -X GET "http://localhost:3000/api/v1/developers/1/payouts?page=1&limit=20" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

## Dashboard

### 16. Admin Dashboard
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/admin" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

### 17. Developer Dashboard
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/developer/1" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

## GitHub Webhook

### 18. Test GitHub Webhook
```bash
curl -X POST "http://localhost:3000/api/v1/webhooks/github" \
  -H "Content-Type: application/json" \
  -H "x-github-event: pull_request" \
  -d '{
    "action": "opened",
    "pull_request": {
      "id": 12345,
      "number": 45,
      "title": "Test PR from webhook",
      "body": "Testing webhook integration",
      "state": "open",
      "user": {
        "login": "test-user",
        "id": 67890,
        "avatar_url": "https://github.com/test-user.png"
      },
      "head": {
        "ref": "feature/test",
        "sha": "abc123"
      },
      "base": {
        "ref": "main",
        "sha": "def456"
      },
      "html_url": "https://github.com/org/repo/pull/45",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    },
    "repository": {
      "id": 123,
      "name": "test-repo",
      "full_name": "org/test-repo",
      "private": false,
      "html_url": "https://github.com/org/test-repo",
      "clone_url": "https://github.com/org/test-repo.git"
    },
    "sender": {
      "login": "test-user",
      "id": 67890,
      "avatar_url": "https://github.com/test-user.png"
    }
  }'
```

## Error Handling Examples

### 19. Invalid Token
```bash
curl -X GET "http://localhost:3000/api/v1/projects" \
  -H "Authorization: Bearer invalid-token"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 20. Missing Required Fields
```bash
curl -X POST "http://localhost:3000/api/v1/projects" \
  -H "Authorization: Bearer mock-jwt-123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Project without name"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid input data",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["name"],
      "message": "Required"
    }
  ]
}
```

### 21. Resource Not Found
```bash
curl -X GET "http://localhost:3000/api/v1/projects/999" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Project not found"
}
```

## Testing with JavaScript/Fetch

### 22. JavaScript Example
```javascript
// Login and get token
const loginResponse = await fetch('/api/v1/auth/admin/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@devpaystream.com',
    password: 'admin123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.token;

// Use token for authenticated requests
const projectsResponse = await fetch('/api/v1/projects', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const projectsData = await projectsResponse.json();
console.log('Projects:', projectsData);
```

### 23. React Hook Example
```typescript
import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  budget: number;
  active: boolean;
}

export function useProjects(token: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/v1/projects', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setProjects(data.data);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchProjects();
    }
  }, [token]);

  return { projects, loading, error };
}
```

## Performance Testing

### 24. Load Testing with Apache Bench
```bash
# Test projects endpoint with 100 requests, 10 concurrent
ab -n 100 -c 10 -H "Authorization: Bearer mock-jwt-123456789" \
   "http://localhost:3000/api/v1/projects"

# Test with different page sizes
ab -n 50 -c 5 -H "Authorization: Bearer mock-jwt-123456789" \
   "http://localhost:3000/api/v1/projects?limit=100"
```

### 25. Stress Testing
```bash
# Test with high concurrency
ab -n 1000 -c 50 -H "Authorization: Bearer mock-jwt-123456789" \
   "http://localhost:3000/api/v1/dashboard/admin"
```

## Environment Variables

Set these environment variables for production:

```bash
# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# GitHub Webhook
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret

# Database
DATABASE_URL=your-database-connection-string

# API Configuration
API_RATE_LIMIT=100
API_RATE_LIMIT_WINDOW=60000
```

## Monitoring and Logging

### 26. Add Request Logging
```typescript
// In your API routes, add logging
console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
console.log('Request Headers:', Object.fromEntries(request.headers.entries()));
console.log('Request Body:', await request.text());
```

### 27. Response Time Monitoring
```typescript
const startTime = Date.now();
// ... your API logic ...
const endTime = Date.now();
console.log(`Response time: ${endTime - startTime}ms`);
```

## Security Testing

### 28. SQL Injection Test
```bash
curl -X GET "http://localhost:3000/api/v1/projects?search='; DROP TABLE projects; --" \
  -H "Authorization: Bearer mock-jwt-123456789"
```

### 29. XSS Test
```bash
curl -X POST "http://localhost:3000/api/v1/projects" \
  -H "Authorization: Bearer mock-jwt-123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"xss\")</script>",
    "description": "XSS test",
    "budget": 1000
  }'
```

### 30. Rate Limiting Test
```bash
# Make many requests quickly to test rate limiting
for i in {1..200}; do
  curl -X GET "http://localhost:3000/api/v1/projects" \
    -H "Authorization: Bearer mock-jwt-123456789" &
done
wait
```

These examples should help you get started with testing and using the DevPayStream API. Remember to replace the mock data with real database implementations and add proper error handling and validation in production.
