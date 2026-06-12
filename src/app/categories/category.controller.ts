import { Request, Response, NextFunction } from "express";
import { categoryService } from "./category.service";
import { GetCategoryFilter } from "./category.schema";
import { NotFoundError } from "../../helper/errors";
import { resolveBranchId } from "../../helper/resolveBranchId";

export const categoryController = {
  async createCategory(req: Request, res: Response) {
    const branchId = resolveBranchId(req);
    if (!branchId) {
      return res.status(400).json({ message: "Cabang tidak ditemukan" });
    }

    try {
      const result = await categoryService.createCategory(req.body, branchId);
      return res.status(201).json({
        message: "Kategori berhasil dibuat",
        data: result,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },

  async updateCategory(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const branchId = resolveBranchId(req);
      const result = await categoryService.updateCategory(
        req.params.id,
        req.body,
        branchId,
      );
      return res.status(200).json({
        message: "Kategori berhasil diupdate",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteCategory(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const branchId = resolveBranchId(req);
      await categoryService.deleteCategory(req.params.id, branchId);
      return res.status(200).json({ message: "Kategori berhasil dihapus" });
    } catch (error) {
      next(error);
    }
  },

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = resolveBranchId(req);
      const { page, limit } = GetCategoryFilter.parse(req.query);

      const result = await categoryService.getCategories({
        page,
        limit,
        branchId,
      });
      return res.status(200).json({
        message: "Kategori berhasil diambil",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
};
