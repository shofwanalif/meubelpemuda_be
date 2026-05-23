import { config } from "../../config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
import { prisma } from "../config/prisma";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";

const accessControl = createAccessControl({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "delete",
    "impersonate",
    "impersonate-admins",
    "set-password",
    "get",
    "update",
  ],
});

const owner = accessControl.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "delete",
    "impersonate",
    "impersonate-admins",
    "set-password",
    "get",
    "update",
  ],
});

const karyawan = accessControl.newRole({
  user: [],
});

export const auth = betterAuth({
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,
  trustedOrigins: [config.CLIENT_ORIGIN],
  database: prismaAdapter(prisma, {
    provider: "mysql", // or "mysql", "postgresql", ...etc
  }),

  plugins: [
    admin({
      accessControl,
      roles: { owner, karyawan },
      adminRoles: ["owner"],
      defaultRole: "karyawan",
    }),
  ],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    autoSignIn: false,
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",

    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain: config.COOKIE_DOMAIN,
    },

    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60 * 6,
    cookieCache: {
      enabled: true,
    },
  },
});
