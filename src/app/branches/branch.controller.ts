import { branchService } from "./branch.service";
import { Request, Response } from "express";
import { logger } from "../../config/logging";

export const branchController = {
  async createBranch(req: Request, res: Response) {
    try {
      const data = await branchService.createBranch(req.body);
      res.status(201).json({ message: "Cabang berhasil dibuat", data });
    } catch (error) {
      logger.error("Error creating branch: ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async getAllBranches(req: Request, res: Response) {
    try {
      const branches = await branchService.getAllBranches();
      const totalBranches = branches.length;
      if (branches.length === 0) {
        return res.status(404).json({ message: "Tidak ada data cabang" });
      }
      res.status(200).json({ data: branches, total: totalBranches });
    } catch (error) {
      logger.error("Error fetching branches: ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async updateBranch(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const data = req.body;
      const updateBranch = await branchService.updateBranch(id, data);
      res
        .status(200)
        .json({ message: "Cabang berhasil diperbarui", data: updateBranch });
    } catch (error) {
      logger.error("Error updating branch: ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async deleteBranch(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await branchService.deleteBranch(id);
      res.status(200).json({ message: "Cabang berhasil dihapus" });
    } catch (error) {
      logger.error("Error deleting branch: ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async searchBranch(req: Request, res: Response) {
    try {
      const { keyword } = req.query as { keyword: string };
      const branches = await branchService.searchBranch(keyword);
      if (branches.length === 0) {
        return res
          .status(404)
          .json({ message: "Tidak ada cabang yang ditemukan" });
      }
      res.status(200).json({ data: branches });
    } catch (error) {
      logger.error("Error searching branches: ", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
