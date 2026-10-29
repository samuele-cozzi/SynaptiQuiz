import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url)
);

for (const [provider, databaseUrl] of [
  ["sqlite", "file:./prisma/dev.db"],
  ["postgresql", "postgresql://postgres:password@localhost:5432/synaptiquiz"],
]) {
  const result = spawnSync(process.execPath, [prismaCli, "generate"], {
    env: {
      ...process.env,
      DATABASE_PROVIDER: provider,
      DATABASE_URL: databaseUrl,
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
