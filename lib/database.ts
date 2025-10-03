import { neon } from '@neondatabase/serverless'

// Create a single database connection instance
const sql = neon(process.env.DATABASE_URL || '')

// Database query helper functions
export class Database {
  // Projects
  static async getProjects(filters: {
    page?: number
    limit?: number
    search?: string
    adminId?: number
    isActive?: boolean
    tags?: string[]
  } = {}) {
    try {
      const { page = 1, limit = 20, search, adminId, isActive, tags } = filters
      const offset = (page - 1) * limit

    let whereConditions = []
    let params: any[] = []
    let paramIndex = 1

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (adminId) {
      whereConditions.push(`"adminId" = $${paramIndex}`)
      params.push(adminId)
      paramIndex++
    }

    if (isActive !== undefined) {
      whereConditions.push(`"isActive" = $${paramIndex}`)
      params.push(isActive)
      paramIndex++
    }

    if (tags && tags.length > 0) {
      whereConditions.push(`tags && $${paramIndex}`)
      params.push(tags)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM "Project" 
      ${whereClause}
    `
    const countResult = await sql.query(countQuery, params)
    const total = parseInt(countResult[0].total)

    // Get projects with admin info
    const projectsQuery = `
      SELECT 
        p.*,
        a.id as "admin_id",
        a.name as "admin_name", 
        a.email as "admin_email",
        (SELECT COUNT(*) FROM "PullRequest" WHERE "projectId" = p.id) as "pull_request_count",
        (SELECT COUNT(*) FROM "Payout" WHERE "projectId" = p.id) as "payout_count"
      FROM "Project" p
      LEFT JOIN "Admin" a ON p."adminId" = a.id
      ${whereClause}
      ORDER BY p."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const projects = await sql.query(projectsQuery, params)

    return {
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        repoUrl: project.repoUrl,
        adminId: project.adminId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        isActive: project.isActive,
        maxContributors: project.maxContributors,
        tags: project.tags || [],
        highestBounty: project.highestBounty || 1000,
        lowestBounty: project.lowestBounty || 100,
        budget: project.budget || 0,
        Admin: {
          id: project.admin_id,
          name: project.admin_name,
          email: project.admin_email,
        },
        _count: {
          PullRequest: project.pull_request_count,
          Payout: project.payout_count,
        }
      })),
      total,
      totalPages: Math.ceil(total / limit)
    }
    } catch (error) {
      console.error('Database.getProjects error:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async createProject(projectData: {
    name: string
    description?: string
    repoUrl: string
    adminId: number
    isActive?: boolean
    maxContributors?: number
    tags?: string[]
    highestBounty: number
    lowestBounty: number
    budget?: number
  }) {
    try {
      const {
        name,
        description,
        repoUrl,
        adminId,
        isActive = true,
        maxContributors,
        tags = [],
        highestBounty,
        lowestBounty,
        budget = highestBounty
      } = projectData

    const query = `
      INSERT INTO "Project" (
        name, description, "repoUrl", "adminId", "isActive", 
        "maxContributors", tags, "highestBounty", "lowestBounty", budget,
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *
    `

    const result = await sql.query(query, [
      name, description, repoUrl, adminId, isActive,
      maxContributors, tags, highestBounty, lowestBounty, budget
    ])

    return result[0]
    } catch (error) {
      console.error('Database.createProject error:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getProjectById(id: number) {
    const query = `
      SELECT 
        p.*,
        a.id as "admin_id",
        a.name as "admin_name",
        a.email as "admin_email"
      FROM "Project" p
      LEFT JOIN "Admin" a ON p."adminId" = a.id
      WHERE p.id = $1
    `
    const result = await sql.query(query, [id])
    return result[0] || null
  }

  // Admin
  static async getAdminById(id: number) {
    const query = `SELECT * FROM "Admin" WHERE id = $1`
    const result = await sql.query(query, [id])
    return result[0] || null
  }

  static async getAdminByEmail(email: string) {
    const query = `SELECT * FROM "Admin" WHERE email = $1`
    const result = await sql.query(query, [email])
    return result[0] || null
  }
}

export { sql }
