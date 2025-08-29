# DevPayStream API Documentation

This document describes the complete API structure for the DevPayStream application, a platform for managing developer payments based on pull request contributions.

## Base URL
```
https://your-domain.com/api/v1
```

## Authentication
Most endpoints require authentication via JWT tokens in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication & Admin

#### POST /auth/admin/login
Authenticate admin and receive JWT token.

**Request Body:**
```json
{
  "email": "admin@devpaystream.com",
  "password": "admin123"
}
```

**Response:**
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

### Projects

#### GET /projects
List all projects with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search in project name/description
- `active` (optional): Filter by active status (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "DevPayStream Core",
      "description": "Main payment processing system",
      "githubUrl": "https://github.com/devpaystream/core",
      "budget": 10000,
      "active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### POST /projects
Create a new project (admin only).

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "githubUrl": "https://github.com/org/project",
  "budget": 5000,
  "active": true
}
```

#### GET /projects/{projectId}
Get project details.

#### PUT /projects/{projectId}
Update project metadata (admin only).

#### DELETE /projects/{projectId}
Delete a project (admin only).

### Developers

#### GET /developers
List all developers with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search in username/name/email
- `active` (optional): Filter by active status (true/false)

#### POST /developers
Register or link a developer.

**Request Body:**
```json
{
  "githubUsername": "username",
  "email": "user@example.com",
  "name": "Full Name",
  "avatarUrl": "https://github.com/username.png"
}
```

#### GET /developers/{developerId}
Get developer profile and detailed stats.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "githubUsername": "alice-dev",
    "name": "Alice Developer",
    "email": "alice@example.com",
    "avatarUrl": "https://github.com/alice-dev.png",
    "totalEarnings": 2500,
    "activeProjects": 3,
    "totalPRs": 15,
    "averageScore": 8.5,
    "skills": ["React", "Node.js", "TypeScript"],
    "bio": "Full-stack developer with 5+ years of experience",
    "location": "San Francisco, CA",
    "githubStats": {
      "followers": 150,
      "following": 80,
      "publicRepos": 25,
      "contributions": 1200
    },
    "recentActivity": [...]
  }
}
```

### Pull Requests (PR Tracking)

#### GET /projects/{projectId}/prs
List PRs for a specific project.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `state` (optional): Filter by PR state (open/closed/merged)
- `author` (optional): Filter by author username
- `search` (optional): Search in PR title/description

#### POST /projects/{projectId}/prs
Add or sync a PR.

**Request Body:**
```json
{
  "number": 42,
  "title": "Add new feature",
  "description": "Feature description",
  "author": "username",
  "githubUrl": "https://github.com/org/repo/pull/42",
  "state": "open",
  "baseBranch": "main",
  "headBranch": "feature/new-feature",
  "additions": 150,
  "deletions": 10,
  "changedFiles": 5
}
```

#### GET /projects/{projectId}/prs/{prNumber}
Get detailed PR information including reviews, commits, and files.

#### PATCH /projects/{projectId}/prs/{prNumber}
Update PR data (e.g., merge state, review score).

### Payouts

#### GET /projects/{projectId}/payouts
List all payouts for a project.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by payout status
- `developerId` (optional): Filter by developer
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response includes summary:**
```json
{
  "success": true,
  "data": [...],
  "summary": {
    "totalPayouts": 10,
    "totalAmount": 2500,
    "completedAmount": 2000,
    "pendingAmount": 500
  }
}
```

#### POST /projects/{projectId}/payouts
Create a new payout.

**Request Body:**
```json
{
  "developerId": "dev-1",
  "amount": 150,
  "description": "Payment for PR #42",
  "type": "pr_reward",
  "status": "pending",
  "reference": "PR #42"
}
```

#### GET /developers/{developerId}/payouts
View payouts specific to a developer with project breakdown.

### Dashboard & Metrics

#### GET /dashboard/admin
Admin overview with comprehensive metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalBudget": 23000,
      "activeBudget": 15000,
      "totalPayouts": 3500,
      "pendingPayouts": 500,
      "activeDevelopers": 8,
      "totalDevelopers": 12,
      "totalPRs": 45,
      "mergedPRs": 38,
      "openPRs": 7
    },
    "recentActivity": {...},
    "monthlyTrends": [...],
    "topDevelopers": [...],
    "projectPerformance": [...],
    "quickStats": {...}
  }
}
```

#### GET /dashboard/developer/{developerId}
Developer overview with personal metrics and opportunities.

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {...},
    "overview": {
      "totalEarnings": 2500,
      "pendingEarnings": 150,
      "totalPRs": 15,
      "mergedPRs": 12,
      "openPRs": 3,
      "averageScore": 8.5,
      "activeProjects": 3
    },
    "monthlyEarnings": [...],
    "projectBreakdown": [...],
    "skillBreakdown": [...],
    "recentPRs": [...],
    "upcomingOpportunities": [...],
    "performance": {...}
  }
}
```

### GitHub Webhook

#### POST /webhooks/github
Receive GitHub events for automatic processing.

**Headers:**
- `x-github-event`: Event type (push, pull_request, issues, etc.)
- `x-hub-signature-256`: Webhook signature for verification

**Supported Events:**
- `push`: Code pushes to main/master branches
- `pull_request`: PR creation, updates, merges
- `issues`: Issue creation and updates
- `create`: Branch/tag creation
- `delete`: Branch/tag deletion

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (resource already exists)
- `500`: Internal Server Error

## Pagination

Paginated endpoints include pagination metadata:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Other endpoints: 100 requests per minute
- Webhook endpoints: 1000 requests per minute

## Development Notes

- All endpoints currently use mock data
- Authentication is mocked with simple token validation
- Replace mock implementations with actual database and service calls
- Implement proper JWT verification and GitHub webhook signature validation
- Add comprehensive logging and monitoring
- Implement proper error handling and validation
- Add API versioning strategy
- Consider implementing GraphQL for complex queries

## Testing

Test the API endpoints using tools like:
- Postman
- Insomnia
- curl
- Thunder Client (VS Code extension)

Example curl command:
```bash
curl -X GET "https://your-domain.com/api/v1/projects" \
  -H "Authorization: Bearer your-token-here"
```
