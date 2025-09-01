# DevPayStream API Setup Guide

This guide will help you set up the DevPayStream API with Prisma database integration.

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.local` file in your project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:example@localhost:5435/devpaystream"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# NextAuth Configuration
NEXTAUTH_SECRET="your-nextauth-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth (Required for admin authentication)
GITHUB_ID="your-github-oauth-app-client-id"
GITHUB_SECRET="your-github-oauth-app-client-secret"

# GitHub Webhook
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"

# API Configuration
API_RATE_LIMIT=100
API_RATE_LIMIT_WINDOW=60000
```

### 2. GitHub OAuth Setup

To enable GitHub OAuth authentication:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: DevPayStream Admin
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret to your `.env.local` file

### 3. Start PostgreSQL Database

```bash
# Start the database container
docker-compose up -d

# Verify it's running
docker-compose ps
```

### 4. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed the database with initial data
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

Your API will be available at `http://localhost:3000/api/v1`

## 📊 Database Schema

The API uses the following Prisma schema:

- **Admin**: System administrators who manage projects
- **Developer**: GitHub developers who contribute via PRs
- **Project**: Projects with budgets for developer payments
- **PullRequest**: GitHub PRs with scoring and payment tracking
- **Payout**: Payment records for completed work

## 🔐 Authentication

### GitHub OAuth Authentication

The admin dashboard now uses GitHub OAuth for authentication. When you visit `/admin/dashboard`:

1. If not signed in, you'll be redirected to GitHub OAuth
2. After successful authentication, you'll be automatically mapped to an Admin record
3. You can then access the admin dashboard and create projects

### Legacy Admin Login (Optional)

For backward compatibility, the old admin login endpoint is still available:

```bash
curl -X POST "http://localhost:3000/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@devpaystream.com",
    "password": "admin123"
  }'
```

**Default Admin Credentials:**
- Email: `admin@devpaystream.com`
- Password: `admin123`

### API Authentication

The API now automatically authenticates users via NextAuth session cookies. No manual token handling is required.

## 🧪 Testing the API

### 1. Test Admin Login
```bash
curl -X POST "http://localhost:3000/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@devpaystream.com",
    "password": "admin123"
  }'
```

### 2. List Projects
```bash
curl -X GET "http://localhost:3000/api/v1/projects" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Create a Project
```bash
curl -X POST "http://localhost:3000/api/v1/projects" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New API Project",
    "description": "Building a new API service",
    "repoUrl": "https://github.com/org/new-api",
    "budget": 8000,
    "adminId": 1
  }'
```

### 4. List Developers
```bash
curl -X GET "http://localhost:3000/api/v1/developers" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Create a Developer
```bash
curl -X POST "http://localhost:3000/api/v1/developers" \
  -H "Content-Type: application/json" \
  -d '{
    "githubId": "new-dev",
    "username": "new-dev"
  }'
```

### 6. View Admin Dashboard
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/admin" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7. View Developer Dashboard
```bash
curl -X GET "http://localhost:3000/api/v1/dashboard/developer/1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔧 Development Workflow

### 1. Database Changes
When you modify the Prisma schema:

```bash
# Regenerate Prisma client
pnpm db:generate

# Push changes to database
pnpm db:push

# If you need to reset the database
pnpm db:push --force-reset
pnpm db:seed
```

### 2. Adding New API Endpoints
1. Create the route file in `app/api/v1/`
2. Import and use Prisma client
3. Add proper error handling
4. Update the README.md documentation

### 3. Testing Changes
```bash
# Test specific endpoint
curl -X GET "http://localhost:3000/api/v1/projects/1"

# Test with authentication
curl -X GET "http://localhost:3000/api/v1/projects" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📁 Project Structure

```
app/api/
├── v1/                          # API version 1
│   ├── auth/admin/login/        # Admin authentication
│   ├── projects/                # Project management
│   ├── developers/              # Developer management
│   ├── projects/[id]/prs/      # Pull request tracking
│   ├── projects/[id]/payouts/  # Payout management
│   ├── dashboard/admin/         # Admin dashboard
│   ├── dashboard/developer/     # Developer dashboard
│   └── webhooks/github/        # GitHub webhook
├── middleware/auth.ts           # Authentication middleware
├── utils/response.ts            # Response utilities
└── README.md                    # API documentation

prisma/
├── schema.prisma               # Database schema
└── seed.ts                     # Database seeding
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```bash
Error: P1001: Can't reach database server
```
**Solution**: Make sure PostgreSQL container is running
```bash
docker-compose up -d
```

#### 2. Prisma Client Not Generated
```bash
Error: Cannot find module '@prisma/client'
```
**Solution**: Generate Prisma client
```bash
pnpm db:generate
```

#### 3. Database Schema Out of Sync
```bash
Error: The database schema is not in sync with the Prisma schema
```
**Solution**: Push schema changes
```bash
pnpm db:push
```

#### 4. Port Already in Use
```bash
Error: Port 3000 is already in use
```
**Solution**: Change port or kill existing process
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
pnpm dev -- -p 3001
```

### Debug Mode

Enable debug logging by adding to your `.env.local`:

```bash
DEBUG=prisma:*
```

## 🔒 Security Considerations

### Production Deployment

1. **Change Default Passwords**: Update admin credentials
2. **Secure JWT Secret**: Use a strong, random JWT secret
3. **Database Security**: Use production-grade database with proper access controls
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Implement proper rate limiting
6. **Input Validation**: All inputs are validated with Zod schemas

### Environment Variables

Never commit sensitive environment variables to version control:

```bash
# .gitignore
.env.local
.env.production
.env.*.local
```

## 📈 Monitoring & Logging

### Request Logging
All API endpoints include console logging for debugging:

```typescript
console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
```

### Error Logging
Errors are logged with stack traces for debugging:

```typescript
console.error('API Error:', error);
```

## 🚀 Next Steps

### 1. Implement Real Authentication
- Replace mock JWT with proper JWT library (jsonwebtoken)
- Add password hashing (bcrypt)
- Implement refresh tokens

### 2. Add Database Migrations
- Use `prisma migrate` for production deployments
- Version control your database schema changes

### 3. Implement GitHub Integration
- Add GitHub OAuth for developer authentication
- Implement webhook signature verification
- Add GitHub API rate limiting

### 4. Add Testing
- Unit tests for API endpoints
- Integration tests with test database
- API contract testing

### 5. Performance Optimization
- Add database query optimization
- Implement caching (Redis)
- Add connection pooling

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Zod Validation](https://zod.dev/)
- [PostgreSQL with Docker](https://hub.docker.com/_/postgres)

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your environment variables
3. Check the database connection
4. Review the console logs for errors
5. Ensure all dependencies are installed

Happy coding! 🎉
