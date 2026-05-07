import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
import { prisma } from "../config/prisma";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc } from "better-auth/plugins/admin/access";

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
  ...adminAc.statements,
});

const karyawan = accessControl.newRole({
  user: [],
});

export const auth = betterAuth({
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

  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60 * 6,
    cookieCache: {
      enabled: true,
    },
  },

  trustedOrigins: ["http://localhost:3000", "http://localhost:4000"],
});
