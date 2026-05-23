import { auth } from "../../lib/auth";
import { prisma } from "../../config/prisma";

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

    // const user = await auth.api.createUser({
    //   body: {
    //     name: data.name,
    //     email: data.email,
    //     password: data.password,
    //     data: {
    //       branchId: data.branchId,
    //     },
    //   },
    // });
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

    // Buat EmployeeBranch jika user adalah karyawan dan ada branchId
    //   if (role === "karyawan" && data.branchId) {
    //     await prisma.employeeBranch.create({
    //       data: {
    //         userId: created.user.id,
    //         branchId: data.branchId,
    //       },
    //     });
    //   }

    //   return user;
    // },

    // async assignBranch(userId: string, branchId: string) {
    //   // Cek apakah user sudah memiliki relasi dengan branch
    //   const alreadyAssigned = await prisma.employeeBranch.findUnique({
    //     where: {
    //       userId,
    //     },
    //   });

    //   if (alreadyAssigned) {
    //     return alreadyAssigned;
    //   }

    //   return await prisma.employeeBranch.create({
    //     data: {
    //       userId,
    //       branchId,
    //     },
    //   });
    // },
  },

  async assignBranch(userId: string, branchId: string) {
    return prisma.employeeBranch.upsert({
      where: { userId },
      update: { branchId },
      create: { userId, branchId },
    });
  },

  async getListUsers() {
    return prisma.user.findMany({
      where: {
        role: "karyawan",
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
  },
};
