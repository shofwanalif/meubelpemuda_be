// import dotenv from "dotenv";
// dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_PORT: process.env.APP_PORT || 4000,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:4000",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
  IS_PRODUCTION: process.env.NODE_ENV === "production",
};
