import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { getDatabaseProvider, getDatabaseUrl } from '../../prisma/database-provider'

const prismaClientSingleton = () => {
    const provider = getDatabaseProvider()
    const databaseUrl = getDatabaseUrl(provider)
    const adapter = provider === 'postgresql'
        ? new PrismaPg(new Pool({ connectionString: databaseUrl }))
        : new PrismaLibSql({ url: databaseUrl })
    return new PrismaClient({ adapter })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
