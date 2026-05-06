import "dotenv/config";
import postgres from "postgres";

const target = process.env.DATABASE_URL;
if (!target) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const url = new URL(target);
const dbName = url.pathname.replace(/^\//, "");
if (!dbName) {
  console.error("DATABASE_URL must include a database name in the path");
  process.exit(1);
}

const adminUrl = new URL(target);
adminUrl.pathname = "/postgres";

async function main() {
  const sql = postgres(adminUrl.toString(), { max: 1 });
  try {
    const existing = await sql<{ datname: string }[]>`
      select datname from pg_database where datname = ${dbName}
    `;
    if (existing.length) {
      console.log(`Database "${dbName}" already exists.`);
    } else {
      await sql.unsafe(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created.`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
