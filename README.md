# GigFi - Decentralized Developer Payment Platform

GigFi is a comprehensive platform that enables project administrators to fund smart contracts on the Aptos blockchain and manage developer payments based on GitHub pull request contributions. The platform combines blockchain technology with traditional project management to create a transparent, automated payment system for open-source development.

## 🌟 Features

### For Project Administrators
- **Smart Contract Integration**: Fund projects using Aptos blockchain with APT tokens
- **Project Management**: Create and manage projects with customizable bounty ranges
- **Real-time Monitoring**: Track project performance, developer contributions, and payment status
- **Wallet Integration**: Connect Aptos wallets for seamless blockchain transactions
- **Dashboard Analytics**: Comprehensive overview of project metrics and developer activity

### For Contributors
- **GitHub Integration**: Automatically sync pull requests from GitHub repositories
- **Bounty Claiming**: Submit contributions for review and claim bounties
- **Project Discovery**: Browse available projects and their bounty ranges
- **Contribution Tracking**: Monitor your earnings and contribution history
- **Automated Scoring**: AI-powered contribution evaluation and bounty calculation

### Technical Features
- **Blockchain Integration**: Built on Aptos blockchain for secure, transparent transactions
- **Database Management**: PostgreSQL with Prisma ORM for robust data management
- **Authentication**: NextAuth.js with GitHub OAuth integration
- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Type Safety**: Full TypeScript implementation with comprehensive type definitions

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: React hooks and context
- **Authentication**: NextAuth.js with GitHub OAuth
- **Blockchain**: Aptos wallet adapter for wallet integration

### Backend
- **API**: Next.js API routes with RESTful endpoints
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens and session management
- **Blockchain**: Aptos TypeScript SDK for contract interactions

### Smart Contract
- **Platform**: Aptos blockchain
- **Language**: Move programming language
- **Features**: Project escrow management, automated funding, withdrawal capabilities

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Aptos wallet (Petra recommended)
- GitHub account for OAuth

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd devpaystream
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Configure the following variables in `.env.local`:
   ```env
   # Database
   DATABASE_URL="postgresql://postgres:password@localhost:5432/gigfi"
   
   # Authentication
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   
   # GitHub OAuth
   GITHUB_ID="your-github-client-id"
   GITHUB_SECRET="your-github-client-secret"
   
   # JWT
   JWT_SECRET="your-jwt-secret"
   ```

4. **Set up the database**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Sign in with GitHub
   - Choose your role (Admin or Contributor)

## 📱 Usage

### For Administrators

1. **Connect Wallet**: Connect your Aptos wallet to manage blockchain transactions
2. **Initialize Vault**: Set up the smart contract vault for project funding
3. **Create Projects**: 
   - Click "Fund & Create Project"
   - Enter project details (name, description, repository URL)
   - Set bounty range (minimum and maximum amounts)
   - Fund the project with APT tokens
4. **Monitor Projects**: View project performance, developer contributions, and payment status
5. **Manage Funding**: Add additional funds to existing projects as needed

### For Contributors

1. **Browse Projects**: View available projects and their bounty ranges
2. **Connect GitHub**: Sign in with GitHub to sync your pull requests
3. **Claim Bounties**: 
   - Navigate to a project's claim page
   - Submit your pull request for review
   - AI will evaluate your contribution and calculate bounty amount
4. **Track Earnings**: Monitor your total earnings and contribution history

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/admin/login` - Admin authentication
- `POST /api/v1/auth/contributor/login` - Contributor authentication

### Project Management
- `GET /api/v1/projects` - List all projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project

### Contributor Features
- `GET /api/v1/contributor/github-prs` - Fetch GitHub pull requests
- `POST /api/v1/contributor/github-prs/claim-bounty` - Claim bounty for PR
- `GET /api/v1/contributor/pr-claim-status` - Check claim status

### Dashboard Data
- `GET /api/v1/dashboard/admin` - Admin dashboard data
- `GET /api/v1/dashboard/developer/{id}` - Developer dashboard data

## 🏛️ Smart Contract

The platform uses a Move smart contract deployed on Aptos:

### Key Functions
- `initialize()` - Initialize the escrow vault
- `create_project_escrow_auto()` - Create project with auto-generated ID
- `fund_project()` - Add funds to existing project
- `withdraw_from_project()` - Withdraw funds from project
- `get_project_balance()` - Query project balance

### Contract Address
The contract is deployed at: `fund_withdraw_v2::project_escrow_v3`

## 🗄️ Database Schema

### Core Models
- **Admin**: Project administrators
- **Developer**: Contributors with GitHub integration
- **Project**: Project information and bounty settings
- **PullRequest**: GitHub PR data and bounty claims
- **Payout**: Payment records and transaction history

## 🛠️ Development

### Available Scripts
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:seed      # Seed database with sample data
```

### Project Structure
```
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   ├── contributor/       # Contributor pages
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
├── lib/                   # Utility libraries
│   └── contract/          # Aptos contract integration
├── prisma/                # Database schema and migrations
├── contract/              # Move smart contract
└── public/                # Static assets
```

## 🔒 Security

- **Authentication**: Secure JWT-based authentication with GitHub OAuth
- **Database**: Parameterized queries to prevent SQL injection
- **Blockchain**: Aptos blockchain provides cryptographic security
- **Environment**: Sensitive data stored in environment variables
- **Validation**: Input validation using Zod schemas

## 🚀 Deployment

### Environment Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Deploy smart contract to Aptos
4. Set up GitHub OAuth application
5. Deploy to Vercel or similar platform

### Production Considerations
- Use production database
- Set secure JWT secrets
- Configure proper CORS settings
- Set up monitoring and logging
- Enable rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

## 🔮 Roadmap

- [ ] Multi-chain support
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Automated testing suite
- [ ] Enhanced AI contribution scoring
- [ ] Integration with more project management tools

---

Built with ❤️ using Next.js, Aptos, and modern web technologies.