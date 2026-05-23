import { userService } from "./user.service";
import { Request, Response } from "express";
import { logger } from "../../config/logging";

export const userController = {
  async createUser(req: Request, res: Response) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({ message: "User berhasil dibuat", data: user });
    } catch (error) {
      logger.error("Error creating user: ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async assignBranch(req: Request, res: Response) {
    try {
      const { userId, branchId } = req.body;
      const assgined = await userService.assignBranch(userId, branchId);
      res.status(200).json({
        message: "Berhasil mengaitkan user ke cabang",
        data: assgined,
      });
    } catch (error) {
      logger.error("Error assigning branch to user: ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async getListUsers(req: Request, res: Response) {
    try {
      const users = await userService.getListUsers();
      res
        .status(200)
        .json({ message: "berhasil mengambil daftar karyawan", data: users });
    } catch (error) {
      logger.error("Error getting list users: ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
