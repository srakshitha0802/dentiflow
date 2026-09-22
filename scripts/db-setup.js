#!/usr/bin/env node

/**
 * DentiFlow Database Auto-Setup Script
 *
 * This script runs during build & startup on deployment platforms (Render, Railway, Fly.io, etc.):
 * 1. Checks the DATABASE_URL environment variable.
 * 2. Dynamically configures prisma/schema.prisma datasource provider:
 *    - 'postgresql' if DATABASE_URL starts with postgres:// or postgresql://
 *    - 'sqlite' if DATABASE_URL is file: or not set (defaults to file:./dev.db)
 * 3. Runs `prisma generate` to produce the matching Prisma Client.
 * 4. Runs `prisma db push --accept-data-loss` to sync database tables.
 * 5. Checks if the database is empty (0 users); if so, automatically runs the seed script
 *    so all demo accounts, doctors, treatments, and patient records are immediately ready!
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const schemaPath = path.join(rootDir, "prisma", "schema.prisma");

function getDbUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    return process.env.DATABASE_URL.trim();
  }

  // Check .env / .env.local file if not in process.env
  for (const envFile of [".env.local", ".env"]) {
    const filePath = path.join(rootDir, envFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }

  return "file:./dev.db";
}

function runCommand(cmd, env = {}) {
  console.log(`[db-setup] Executing: ${cmd}`);
  execSync(cmd, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

async function setupDatabase() {
  console.log("==================================================");
  console.log("🏥 DentiFlow — Automated Database Setup & Verification");
  console.log("==================================================");

  const dbUrl = getDbUrl();
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
  const targetProvider = isPostgres ? "postgresql" : "sqlite";

  console.log(`[db-setup] Target Database Provider: ${targetProvider}`);
  console.log(`[db-setup] Database URL: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);

  // 1. Update schema.prisma datasource provider if needed
  if (fs.existsSync(schemaPath)) {
    let schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const currentProviderMatch = schemaContent.match(/datasource\s+db\s*\{[^}]*provider\s*=\s*"([^"]+)"/s);
    const currentProvider = currentProviderMatch ? currentProviderMatch[1] : null;

    if (currentProvider !== targetProvider) {
      console.log(`[db-setup] Updating prisma/schema.prisma datasource provider from '${currentProvider}' to '${targetProvider}'...`);
      schemaContent = schemaContent.replace(
        /(datasource\s+db\s*\{[^}]*provider\s*=\s*")[^"]+(")/s,
        `$1${targetProvider}$2`
      );
      fs.writeFileSync(schemaPath, schemaContent, "utf-8");
      console.log("[db-setup] ✓ prisma/schema.prisma updated successfully.");
    } else {
      console.log(`[db-setup] ✓ prisma/schema.prisma is already configured for '${targetProvider}'.`);
    }
  }

  // 2. Generate Prisma Client
  console.log("[db-setup] Generating Prisma Client...");
  runCommand("npx prisma generate", { DATABASE_URL: dbUrl });

  // 3. Push schema to database
  console.log("[db-setup] Synchronizing schema with database tables...");
  runCommand("npx prisma db push --accept-data-loss", { DATABASE_URL: dbUrl });

  // 4. Auto-Seed if database is empty
  console.log("[db-setup] Checking if database needs initial seeding...");
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        console.log("[db-setup] 🌱 Database is empty. Running initial database seed...");
        await prisma.$disconnect();
        runCommand("npm run db:seed", { DATABASE_URL: dbUrl });
        console.log("[db-setup] ✓ Database seeded with demo admin and clinical records!");
      } else {
        console.log(`[db-setup] ✓ Database already initialized with ${userCount} users. Skipping seed.`);
        await prisma.$disconnect();
      }
    } catch (err) {
      console.warn("[db-setup] Note: Could not check user count directly:", err.message);
      try {
        await prisma.$disconnect();
      } catch (_) {}
    }
  } catch (e) {
    console.warn("[db-setup] Prisma client validation note:", e.message);
  }

  console.log("==================================================");
  console.log("✓ Database setup completed successfully!");
  console.log("==================================================");
}

async function run() {
  try {
    await setupDatabase();
  } catch (error) {
    console.error("[db-setup] ❌ Setup error:", error);
    process.exit(1);
  }
}

run();

