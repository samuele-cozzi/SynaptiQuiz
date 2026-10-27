import { afterEach, describe, expect, it, vi } from "vitest";
import { getDatabaseProvider, getDatabaseUrl } from "../../prisma/database-provider";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("database provider configuration", () => {
  it("defaults to SQLite when no provider or URL is configured", () => {
    vi.stubEnv("DATABASE_PROVIDER", "");
    vi.stubEnv("DATABASE_URL", "");

    expect(getDatabaseProvider()).toBe("sqlite");
    expect(getDatabaseUrl()).toBe("file:./prisma/dev.db");
  });

  it("detects an existing PostgreSQL URL when provider is not explicit", () => {
    vi.stubEnv("DATABASE_PROVIDER", "");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/synaptiquiz");

    expect(getDatabaseProvider()).toBe("postgresql");
  });

  it("uses the explicitly selected provider", () => {
    vi.stubEnv("DATABASE_PROVIDER", "sqlite");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/synaptiquiz");

    expect(getDatabaseProvider()).toBe("sqlite");
  });

  it("rejects unknown provider values", () => {
    vi.stubEnv("DATABASE_PROVIDER", "mysql");

    expect(() => getDatabaseProvider()).toThrow(/Unsupported DATABASE_PROVIDER/);
  });
});
