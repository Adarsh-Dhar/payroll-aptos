import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin users
  const admin1 = await prisma.admin.upsert({
    where: { email: 'admin@devpaystream.com' },
    update: {},
    create: {
      email: 'admin@devpaystream.com',
      name: 'Admin User',
      password: 'admin123', // In production, use bcrypt to hash passwords
    },
  })

  const admin2 = await prisma.admin.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'password123',
    },
  })

  console.log('✅ Admin users created')

  // Create developer users
  const dev1 = await prisma.developer.upsert({
    where: { githubId: 'alice-dev' },
    update: {},
    create: {
      githubId: 'alice-dev',
      username: 'alice-dev',
      email: 'alice@example.com',
      password: 'password123',
    },
  })

  const dev2 = await prisma.developer.upsert({
    where: { githubId: 'bob-coder' },
    update: {},
    create: {
      githubId: 'bob-coder',
      username: 'bob-coder',
      email: 'bob@example.com',
      password: 'password123',
    },
  })

  const dev3 = await prisma.developer.upsert({
    where: { githubId: 'charlie-hacker' },
    update: {},
    create: {
      githubId: 'charlie-hacker',
      username: 'charlie-hacker',
      email: 'charlie@example.com',
      password: 'password123',
    },
  })

  console.log('✅ Developer users created')

  // Create projects
  const project1 = await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'DevPayStream Core',
      description: 'Main payment processing system for developer contributions',
      repoUrl: 'https://github.com/devpaystream/core',
      budget: 15000,
      adminId: admin1.id,
      isActive: true,
      maxContributors: 10,
      tags: ['backend', 'payment', 'typescript', 'nodejs'],
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Frontend Dashboard',
      description: 'Modern React dashboard for project management',
      repoUrl: 'https://github.com/devpaystream/frontend',
      budget: 8000,
      adminId: admin1.id,
      isActive: true,
      maxContributors: 5,
      tags: ['frontend', 'react', 'typescript', 'ui'],
    },
  })

  const project3 = await prisma.project.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'API Gateway',
      description: 'High-performance API gateway with rate limiting',
      repoUrl: 'https://github.com/devpaystream/gateway',
      budget: 12000,
      adminId: admin2.id,
      isActive: true,
      maxContributors: 8,
      tags: ['api', 'gateway', 'golang', 'microservices'],
    },
  })

  const project4 = await prisma.project.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Mobile App',
      description: 'Cross-platform mobile app for contributors',
      repoUrl: 'https://github.com/devpaystream/mobile',
      budget: 6000,
      adminId: admin2.id,
      isActive: false, // Inactive project
      maxContributors: 3,
      tags: ['mobile', 'react-native', 'typescript'],
    },
  })

  console.log('✅ Projects created')

  // Create pull requests
  const pr1 = await prisma.pullRequest.upsert({
    where: { id: 1 },
    update: {},
    create: {
      prNumber: 42,
      title: 'Add user authentication',
      description: 'Implements JWT-based user authentication system',
      additions: 150,
      deletions: 10,
      hasTests: true,
      linkedIssue: 'AUTH-001',
      merged: true,
      score: 8.5,
      amountPaid: 200,
      developerId: dev1.id,
      projectId: project1.id,
    },
  })

  const pr2 = await prisma.pullRequest.upsert({
    where: { id: 2 },
    update: {},
    create: {
      prNumber: 43,
      title: 'Fix payment processing bug',
      description: 'Resolves issue with payment calculation',
      additions: 25,
      deletions: 5,
      hasTests: true,
      linkedIssue: 'PAY-002',
      merged: true,
      score: 7.0,
      amountPaid: 150,
      developerId: dev2.id,
      projectId: project1.id,
    },
  })

  const pr3 = await prisma.pullRequest.upsert({
    where: { id: 3 },
    update: {},
    create: {
      prNumber: 44,
      title: 'Add dark mode support',
      description: 'Implements dark/light theme switching',
      additions: 200,
      deletions: 15,
      hasTests: false,
      linkedIssue: 'UI-003',
      merged: false,
      score: 6.5,
      amountPaid: 0,
      developerId: dev3.id,
      projectId: project2.id,
    },
  })

  console.log('✅ Pull requests created')

  // Create payouts
  const payout1 = await prisma.payout.upsert({
    where: { id: 'payout-1' },
    update: {},
    create: {
      amount: 200,
      developerId: dev1.id,
      projectId: project1.id,
      status: 'completed',
      transactionId: 'tx-001',
    },
  })

  const payout2 = await prisma.payout.upsert({
    where: { id: 'payout-2' },
    update: {},
    create: {
      amount: 150,
      developerId: dev2.id,
      projectId: project1.id,
      status: 'completed',
      transactionId: 'tx-002',
    },
  })

  console.log('✅ Payouts created')

  console.log('🎉 Database seeding completed successfully!')
  console.log(`Created ${await prisma.admin.count()} admin users`)
  console.log(`Created ${await prisma.developer.count()} developer users`)
  console.log(`Created ${await prisma.project.count()} projects`)
  console.log(`Created ${await prisma.pullRequest.count()} pull requests`)
  console.log(`Created ${await prisma.payout.count()} payouts`)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
