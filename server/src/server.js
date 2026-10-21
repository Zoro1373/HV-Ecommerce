import { app } from "./app.js";
import { checkDatabaseConnection, prisma } from "./config/db.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    console.log("✓ Connected to PostgreSQL database via Prisma.");
  } else {
    console.warn("! Notice: Database is not yet reachable. (Configure DATABASE_URL in server/.env)");
  }

  const server = app.listen(PORT, () => {
    console.log(`✓ VERTEX Backend API running on http://localhost:${PORT}`);
    console.log(`✓ Health endpoint: http://localhost:${PORT}/api/health`);
  });

  const shutdown = async () => {
    console.log("\nShutting down server gracefully...");
    server.close(async () => {
      await prisma.$disconnect();
      console.log("✓ Database connection closed. Server terminated.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer();
