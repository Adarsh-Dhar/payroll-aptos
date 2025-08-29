import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin users
  const admin1 = await prisma.admin.upsert({
    where: { email: 'admin@devpaystream.com' },
    update: {},
    create: {
      email: 'admin@devpaystream.com',
      name: 'Admin User',
      password: 'admin123', // TODO: Replace with bcrypt hash in production
    },
  });

  const admin2 = await prisma.admin.upsert({
    where: { email: 'admin2@devpaystream.com' },
    update: {},
    create: {
      email: 'admin2@devpaystream.com',
      name: 'Secondary Admin',
      password: 'admin123', // TODO: Replace with bcrypt hash in production
    },
  });

  console.log('✅ Admin users created');

  // Create developers
  const developer1 = await prisma.developer.upsert({
    where: { githubId: 'alice-dev' },
    update: {},
    create: {
      githubId: 'alice-dev',
      username: 'alice-dev',
      email: 'alice@example.com',
      password: 'password123', // TODO: Replace with bcrypt hash in production
    },
  });

  const developer2 = await prisma.developer.upsert({
    where: { githubId: 'bob-coder' },
    update: {},
    create: {
      githubId: 'bob-coder',
      username: 'bob-coder',
      email: 'bob@example.com',
      password: 'password123', // TODO: Replace with bcrypt hash in production
    },
  });

  const developer3 = await prisma.developer.upsert({
    where: { githubId: 'carol-engineer' },
    update: {},
    create: {
      githubId: 'carol-engineer',
      username: 'carol-engineer',
      email: 'carol@example.com',
      password: 'password123', // TODO: Replace with bcrypt hash in production
    },
  });

  // Add demo contributor account for testing
  const demoContributor = await prisma.developer.upsert({
    where: { githubId: 'demo-dev' },
    update: {},
    create: {
      githubId: 'demo-dev',
      username: 'demo-dev',
      email: 'dev@example.com',
      password: 'devpass123', // TODO: Replace with bcrypt hash in production
    },
  });

  console.log('✅ Developers created');

  // Create projects
  const project1 = await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'DevPayStream Core',
      description: 'Main payment processing system for developer contributions',
      repoUrl: 'https://github.com/devpaystream/core',
      budget: 10000,
      adminId: admin1.id,
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'API Gateway',
      description: 'API management and routing service',
      repoUrl: 'https://github.com/devpaystream/gateway',
      budget: 5000,
      adminId: admin1.id,
    },
  });

  const project3 = await prisma.project.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Mobile App',
      description: 'Cross-platform mobile application',
      repoUrl: 'https://github.com/devpaystream/mobile',
      budget: 8000,
      adminId: admin2.id,
    },
  });

  console.log('✅ Projects created');

  // Create pull requests
  const pr1 = await prisma.pullRequest.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      prNumber: 42,
      title: 'Add payment processing feature',
      description: 'Implements secure payment processing with Stripe integration',
      additions: 450,
      deletions: 23,
      hasTests: true,
      linkedIssue: 'https://github.com/devpaystream/core/issues/123',
      merged: true,
      score: 9.2,
      amountPaid: 150,
      developerId: developer1.id,
      projectId: project1.id,
    },
  });

  const pr2 = await prisma.pullRequest.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      prNumber: 43,
      title: 'Fix authentication bug',
      description: 'Resolves issue with JWT token validation',
      additions: 15,
      deletions: 8,
      hasTests: true,
      linkedIssue: 'https://github.com/devpaystream/core/issues/124',
      merged: false,
      score: 7.5,
      amountPaid: 0,
      developerId: developer2.id,
      projectId: project1.id,
    },
  });

  const pr3 = await prisma.pullRequest.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      prNumber: 15,
      title: 'Implement rate limiting',
      description: 'Adds rate limiting middleware for API endpoints',
      additions: 320,
      deletions: 45,
      hasTests: true,
      linkedIssue: 'https://github.com/devpaystream/gateway/issues/45',
      merged: true,
      score: 8.8,
      amountPaid: 200,
      developerId: developer1.id,
      projectId: project2.id,
    },
  });

  const pr4 = await prisma.pullRequest.upsert({
    where: { id: 4 },
    update: {},
    create: {
      id: 4,
      prNumber: 16,
      title: 'Add user authentication',
      description: 'Implements JWT-based user authentication system',
      additions: 200,
      deletions: 15,
      hasTests: true,
      linkedIssue: 'https://github.com/devpaystream/gateway/issues/46',
      merged: true,
      score: 9.0,
      amountPaid: 180,
      developerId: developer3.id,
      projectId: project2.id,
    },
  });

  const pr5 = await prisma.pullRequest.upsert({
    where: { id: 5 },
    update: {},
    create: {
      id: 5,
      prNumber: 8,
      title: 'Setup React Native project',
      description: 'Initial setup for cross-platform mobile app',
      additions: 150,
      deletions: 0,
      hasTests: false,
      linkedIssue: 'https://github.com/devpaystream/mobile/issues/1',
      merged: true,
      score: 8.5,
      amountPaid: 120,
      developerId: developer2.id,
      projectId: project3.id,
    },
  });

  console.log('✅ Pull requests created');

  // Create payouts
  const payout1 = await prisma.payout.upsert({
    where: { id: 'payout-1' },
    update: {},
    create: {
      id: 'payout-1',
      amount: 150,
      developerId: developer1.id,
      projectId: project1.id,
      paidAt: new Date('2024-01-10T10:00:00Z'),
    },
  });

  const payout2 = await prisma.payout.upsert({
    where: { id: 'payout-2' },
    update: {},
    create: {
      id: 'payout-2',
      amount: 200,
      developerId: developer1.id,
      projectId: project2.id,
      paidAt: new Date('2024-01-12T14:30:00Z'),
    },
  });

  const payout3 = await prisma.payout.upsert({
    where: { id: 'payout-3' },
    update: {},
    create: {
      id: 'payout-3',
      amount: 180,
      developerId: developer3.id,
      projectId: project2.id,
      paidAt: new Date('2024-01-13T09:15:00Z'),
    },
  });

  const payout4 = await prisma.payout.upsert({
    where: { id: 'payout-4' },
    update: {},
    create: {
      id: 'payout-4',
      amount: 120,
      developerId: developer2.id,
      projectId: project3.id,
      paidAt: new Date('2024-01-14T16:45:00Z'),
    },
  });

  console.log('✅ Payouts created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Admins: ${await prisma.admin.count()}`);
  console.log(`- Developers: ${await prisma.developer.count()}`);
  console.log(`- Projects: ${await prisma.project.count()}`);
  console.log(`- Pull Requests: ${await prisma.pullRequest.count()}`);
  console.log(`- Payouts: ${await prisma.payout.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
