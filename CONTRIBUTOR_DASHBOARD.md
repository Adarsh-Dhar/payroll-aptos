# Contributor Dashboard - My PRs Feature

## Overview

The Contributor Dashboard now includes a comprehensive "My PRs" section that allows contributors to view and manage all their pull requests across different projects.

## Features

### 1. My PRs Section
- **Location**: Below the "Available Projects" section in the contributor dashboard
- **Access**: Navigate to `/contributor/dashboard` and scroll down to the "My PRs" section
- **Navigation**: Use the tab navigation at the top to quickly jump between sections

### 2. Statistics Dashboard
The My PRs section displays key metrics in card format:
- **Total PRs**: Count of all pull requests
- **Merged PRs**: Number of successfully merged PRs
- **Average Score**: Average score across all PRs
- **Total Earnings**: Sum of all payments received

### 3. Advanced Filtering
- **Search**: Search PRs by title or description
- **Status Filter**: Filter by merged/open status
- **Project Filter**: Filter by specific project

### 4. PR Table
Each PR displays:
- PR number
- Title and description
- Associated project (with link to repository)
- Status (merged/open)
- Score (with star icon)
- Amount earned and creation date

## API Endpoint

The feature uses a new API endpoint:
```
GET /api/v1/contributor/prs
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `merged`: Filter by merge status (true/false)
- `search`: Search in title/description
- `projectId`: Filter by specific project

**Response includes:**
- PR data with project and developer information
- Statistics (total earnings, PR counts, average score)
- Pagination information

## Technical Implementation

### Components
- `ContributorPRs`: Main component for the PRs section
- `app/contributor/dashboard/page.tsx`: Updated dashboard with navigation tabs
- `app/api/v1/contributor/prs/route.ts`: API endpoint for fetching contributor PRs

### Features
- **Client-side filtering**: Real-time search and filtering without API calls
- **Responsive design**: Works on mobile and desktop
- **Loading states**: Skeleton loaders while data is being fetched
- **Error handling**: Graceful error states with user-friendly messages
- **Smooth animations**: Framer Motion animations for better UX

## Usage

1. **Navigate to Dashboard**: Go to `/contributor/dashboard`
2. **View Projects**: Browse available projects in the top section
3. **Access My PRs**: Scroll down or use the "My PRs" tab to jump to the section
4. **Filter and Search**: Use the search bar and filters to find specific PRs
5. **View Details**: Click on project repository links to view PRs on GitHub

## Future Enhancements

- **Authentication**: Replace mock developer ID with actual user authentication
- **Real-time Updates**: WebSocket integration for live PR status updates
- **Export Functionality**: Download PR data as CSV/PDF
- **Advanced Analytics**: Charts and graphs for earnings trends
- **Notification System**: Alerts for new PR reviews or payments

## Notes

- Currently uses a mock developer ID (1) - this should be replaced with actual authentication
- The feature is designed to work with the existing Prisma schema
- All UI components follow the established design system using Tailwind CSS
- The component is fully responsive and follows accessibility best practices
