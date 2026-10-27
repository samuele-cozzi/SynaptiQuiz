export type DatabaseProvider = "sqlite" | "postgresql";

export function getDatabaseProvider(): DatabaseProvider {
    const configuredProvider = process.env.DATABASE_PROVIDER;
    if (configuredProvider === "sqlite" || configuredProvider === "postgresql") {
        return configuredProvider;
    }
    if (configuredProvider) {
        throw new Error(
            `Unsupported DATABASE_PROVIDER "${configuredProvider}". Use "sqlite" or "postgresql".`
        );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl?.startsWith("postgres://") || databaseUrl?.startsWith("postgresql://")) {
        return "postgresql";
    }

    return "sqlite";
}

export function getDatabaseUrl(provider = getDatabaseProvider()): string {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }
    if (provider === "postgresql") {
        throw new Error("DATABASE_URL is required when DATABASE_PROVIDER=postgresql.");
    }

    return "file:./prisma/dev.db";
}
