// Test Prisma client import
try {
  const { PrismaClient } = require('@prisma/client');
  console.log('PrismaClient imported successfully');
  
  const prisma = new PrismaClient();
  console.log('PrismaClient instantiated successfully');
  
  prisma.$disconnect();
  console.log('Test completed successfully');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
