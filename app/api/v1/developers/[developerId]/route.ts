import { NextRequest, NextResponse } from 'next/server';

// Mock data - replace with your database
let developers = [
  {
    id: '1',
    githubUsername: 'alice-dev',
    email: 'alice@example.com',
    name: 'Alice Developer',
    avatarUrl: 'https://github.com/alice-dev.png',
    totalEarnings: 2500,
    activeProjects: 3,
    totalPRs: 15,
    averageScore: 8.5,
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    skills: ['React', 'Node.js', 'TypeScript', 'Python'],
    bio: 'Full-stack developer with 5+ years of experience',
    location: 'San Francisco, CA',
    githubStats: {
      followers: 150,
      following: 80,
      publicRepos: 25,
      contributions: 1200,
    },
    recentActivity: [
      {
        type: 'pr_merged',
        project: 'DevPayStream Core',
        date: new Date().toISOString(),
        amount: 150,
      },
      {
        type: 'pr_reviewed',
        project: 'API Gateway',
        date: new Date().toISOString(),
        amount: 75,
      }
    ]
  },
  {
    id: '2',
    githubUsername: 'bob-coder',
    email: 'bob@example.com',
    name: 'Bob Coder',
    avatarUrl: 'https://github.com/bob-coder.png',
    totalEarnings: 1800,
    activeProjects: 2,
    totalPRs: 12,
    averageScore: 7.8,
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    skills: ['Java', 'Spring Boot', 'Kubernetes', 'Docker'],
    bio: 'Backend engineer specializing in microservices',
    location: 'New York, NY',
    githubStats: {
      followers: 89,
      following: 45,
      publicRepos: 18,
      contributions: 850,
    },
    recentActivity: [
      {
        type: 'pr_merged',
        project: 'API Gateway',
        date: new Date().toISOString(),
        amount: 200,
      }
    ]
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: { developerId: string } }
) {
  try {
    const { developerId } = params;
    const developer = developers.find(d => d.id === developerId);

    if (!developer) {
      return NextResponse.json(
        { success: false, message: 'Developer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: developer
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
