import { PrismaClient, Prisma } from "@prisma/client";
import dotenv from "dotenv";
import dns from "node:dns/promises";

dotenv.config();

// In-memory DNS cache to avoid repetitive queries and minimize socket churn
const dnsCache = new Map();

/**
 * Checks if an error is a transient connection drop/reset (e.g. OS error 10054, P1001, P1017).
 */
export function isTransientConnectionError(error) {
  if (!error) return false;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (["P1001", "P1002", "P1017"].includes(error.code)) return true;
  }
  const msg = error.message || "";
  return (
    msg.includes("10054") ||
    msg.includes("ConnectionReset") ||
    msg.includes("connection was forcibly closed") ||
    msg.includes("closed by the remote host") ||
    msg.includes("Can't reach database server")
  );
}

/**
 * Executes an operation with bounded retry for transient connection drops.
 * Read-only operations and connectivity checks are safe to retry.
 */
export async function withBoundedRetry(operation, maxRetries = 2, baseDelayMs = 250) {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !isTransientConnectionError(err)) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Resolves Neon database URLs when the local system DNS resolver fails (e.g. RCODE_REFUSED from ISP routers).
 * Preserves the actual hostname and native TLS when system DNS succeeds.
 * Falls back to trusted public DNS (8.8.8.8, 1.1.1.1) with Neon endpoint routing if system DNS is blocked.
 * Applies Neon-recommended pool parameters (pgbouncer=true, connect_timeout=30, connection_limit=5).
 */
async function resolveNeonDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    const isPooled = parsed.hostname.includes("-pooler");

    // PgBouncer does not support SCRAM channel binding
    parsed.searchParams.delete("channel_binding");

    // Standard Neon pooled connection parameters for Prisma
    if (isPooled) {
      if (!parsed.searchParams.has("pgbouncer")) {
        parsed.searchParams.set("pgbouncer", "true");
      }
      if (!parsed.searchParams.has("connect_timeout")) {
        parsed.searchParams.set("connect_timeout", "30");
      }
      if (!parsed.searchParams.has("pool_timeout")) {
        parsed.searchParams.set("pool_timeout", "30");
      }
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "5");
      }
    }

    // Skip DNS resolution if already an IP or localhost
    if (/^[\d.]+$|^\[[a-fA-F0-9:]+\]$|localhost/.test(parsed.hostname)) {
      return parsed.toString();
    }

    // Check if system DNS resolver can resolve the host
    try {
      await dns.lookup(parsed.hostname);
      return parsed.toString(); // Native system DNS works; preserve hostname & full TLS SNI
    } catch {
      // System DNS failed (e.g. JioFiber RCODE_REFUSED). Use public DNS fallback
      let ip = dnsCache.get(parsed.hostname);
      if (!ip) {
        const resolver = new dns.Resolver();
        resolver.setServers(["8.8.8.8", "1.1.1.1"]);
        const ips = await resolver.resolve4(parsed.hostname);
        if (ips && ips.length > 0) {
          ip = ips[0];
          dnsCache.set(parsed.hostname, ip);
        }
      }

      if (ip) {
        const endpointMatch = parsed.hostname.match(/^(ep-[a-z0-9-]+?)(?:-pooler)?\./);
        parsed.hostname = ip;

        if (endpointMatch && !parsed.searchParams.has("options")) {
          parsed.searchParams.set("options", `endpoint=${endpointMatch[1]}`);
        }
        return parsed.toString();
      }
    }
  } catch (err) {
    console.warn("Notice: DNS resolution check skipped:", err.message);
  }
  return rawUrl;
}

// Resolve DATABASE_URL and DIRECT_URL if needed
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = await resolveNeonDatabaseUrl(process.env.DATABASE_URL);
}
if (process.env.DIRECT_URL) {
  process.env.DIRECT_URL = await resolveNeonDatabaseUrl(process.env.DIRECT_URL);
}

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis;

const basePrisma =
  globalForPrisma.basePrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.basePrisma = basePrisma;
}

// Extend Prisma Client with bounded retries on safe read operations
export const prisma =
  globalForPrisma.prisma ||
  basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          const safeReadOps = ["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy"];
          if (safeReadOps.includes(operation)) {
            return withBoundedRetry(() => query(args), 2, 250);
          }
          return query(args);
        },
      },
      $allClientMethods: {
        async $queryRaw({ args, query }) {
          return withBoundedRetry(() => query(args), 2, 250);
        },
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Ensure interactive transactions default to a realistic timeout for transatlantic cloud database queries
const originalTransaction = prisma.$transaction.bind(prisma);
prisma.$transaction = function (arg, options = {}) {
  if (typeof arg === "function") {
    const mergedOptions = {
      maxWait: 10000,
      timeout: 25000,
      ...options,
    };
    return originalTransaction(arg, mergedOptions);
  }
  return originalTransaction(arg, options);
};

export async function checkDatabaseConnection() {
  try {
    await withBoundedRetry(() => prisma.$queryRaw`SELECT 1`, 2, 300);
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

