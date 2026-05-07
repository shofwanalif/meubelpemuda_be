import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client";
import { logger } from "./logging";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST!,
  user: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  database: process.env.DATABASE_NAME!,
  connectionLimit: 5,
});
const prisma = new PrismaClient({
  adapter,
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
    {
      emit: "event",
      level: "error",
    },
  ],
});

prisma.$on("query", (event) => {
  logger.debug("Prisma Query", {
    query: event.query,
  });
});

prisma.$on("info", (event) => {
  logger.info("Prisma Info", {
    message: event.message,
  });
});

prisma.$on("warn", (event) => {
  logger.warn("Prisma Warning", {
    message: event.message,
  });
});

prisma.$on("error", (event) => {
  logger.error("Prisma Error", {
    message: event.message,
  });
});

export { prisma };
