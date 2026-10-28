import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient as SqlitePrismaClient } from '@prisma/client'
import { PrismaClient as PostgreSqlPrismaClient } from '../generated/prisma/postgresql'
import { getDatabaseProvider, getDatabaseUrl } from '../../prisma/database-provider'

const prismaClientSingleton = (): SqlitePrismaClient => {
    const provider = getDatabaseProvider()
    const databaseUrl = getDatabaseUrl(provider)
    if (provider === 'postgresql') {
        const adapter = new PrismaPg(new Pool({ connectionString: databaseUrl }))
        return new PostgreSqlPrismaClient({ adapter }) as unknown as SqlitePrismaClient
    }

    const adapter = new PrismaLibSql({ url: databaseUrl })
    return new SqlitePrismaClient({ adapter })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
