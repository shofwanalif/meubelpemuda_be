import { auth } from "../../lib/auth";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../helper/errors";

interface CreateUserDtoType {
  email: string;
  password: string;
  name: string;
  role?: string;
  branchId?: string;
}

export const userService = {
  async createUser(data: CreateUserDtoType) {
    // Set default role menjadi "karyawan" jika tidak dikirim
    const role = data.role ?? "karyawan";

    if (role === "karyawan" && !data.branchId) {
      throw new Error("branchId wajib untuk assign karyawan");
    }

    if (data.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
      });
      if (!branch) {
        throw new Error("branch tidak ditemukan");
      }
    }

    const created = await auth.api.createUser({
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
        // role: role,
      },
    });

    try {
      if (role === "karyawan" && data.branchId) {
        await prisma.employeeBranch.upsert({
          where: { userId: created.user.id },
          update: { branchId: data.branchId },
          create: {
            userId: created.user.id,
            branchId: data.branchId,
          },
        });
      }
      return created;
    } catch (error) {
      await prisma.user.delete({ where: { id: created.user.id } });
      throw error;
    }
  },

  async assignBranch(userId: string, branchId: string) {
    return prisma.employeeBranch.upsert({
      where: { userId },
      update: { branchId },
      create: { userId, branchId },
    });
  },

  async getListUsers() {
    const users = await prisma.user.findMany({
      where: {
        role: "karyawan",
        deletedAt: null,
      },
      include: {
        employeeBranch: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return users.map((user) => {
      if (user.employeeBranch) {
        const { userId, branchId, ...employeeBranchWithoutIds } =
          user.employeeBranch;
        return {
          ...user,
          employeeBranch: employeeBranchWithoutIds,
        };
      }
      return user;
    });
  },

  async updateUser(id: string, data: Partial<CreateUserDtoType>) {
    const { name, email, role, branchId } = data;

    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
      });
      if (!branch) {
        throw new Error("branch tidak ditemukan");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        name: name,
        email: email,
        role: role,
      },
    });

    return updatedUser;
  },

  async deleteUser(id: string) {
    const existingUser = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, deletedAt: true },
    });

    if (!existingUser) {
      throw new NotFoundError("User tidak ditemukan");
    }

    if (existingUser.deletedAt) {
      throw new Error("User sudah dihapus sebelumnya");
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        deletedAt: true,
      },
    });

    // await auth.api.revokeUserSessions({
    //   body: {
    //     userId: id,
    //   },
    // });

    return {
      success: true,
      message: "User berhasil dinonaktifkan (soft delete)",
      data: updatedUser,
    };
  },
};
