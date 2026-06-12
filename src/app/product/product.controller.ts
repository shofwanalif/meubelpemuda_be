import { NextFunction, Request, Response } from "express";
import { productService } from "./product.service";
import { resolveBranchId } from "../../helper/resolveBranchId";
import { NotFoundError } from "../../helper/errors";
import { GetProductsQuerySchema } from "./product.schema";

export const productController = {
  async createProduct(req: Request, res: Response, next: NextFunction) {
    const branchId = resolveBranchId(req);
    // console.log("branchId:", branchId);
    // console.log("req.body:", req.body);
    // console.log("req.activeBranchId:", req.activeBranchId);
    if (!branchId) {
      return res.status(400).json({ message: "Cabang tidak ditemukan" });
    }

    try {
      const userId = req.session!.user.id;
      const result = await productService.createProduct(
        req.body,
        branchId,
        userId,
      );
      return res.status(201).json({
        message: "Produk berhasil dibuat",
        data: result,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },

  async updateProduct(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const branchId = resolveBranchId(req);
      const userId = req.session!.user.id;

      const result = await productService.updateProduct(
        req.params.id,
        req.body,
        branchId,
        userId,
      );

      return res.status(200).json({
        message: "Produk berhasil diupdate",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteProduct(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const branchId = resolveBranchId(req);
      await productService.deleteProduct(req.params.id, branchId);
      return res.status(200).json({ message: "Produk berhasil dihapus" });
    } catch (error) {
      next(error);
    }
  },

  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = resolveBranchId(req);

      const parsed = GetProductsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await productService.getProducts(branchId, parsed.data);
      return res.status(200).json({
        message: "Produk berhasil diambil",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  // async getProductById(req: Request<{ id: string }>, res: Response) {
  //   try {
  //     const productId = req.params.id;
  //     if (!productId) {
  //       return res.status(400).json({ message: "Product ID harus disertakan" });
  //     }

  //     const product = await productService.getProductById(productId);
  //     return res.status(200).json({ data: product });
  //   } catch (error) {
  //     logger.error("Error getting product by ID: ", error);
  //     if (
  //       error instanceof Error &&
  //       error.message === "Produk tidak ditemukan"
  //     ) {
  //       return res.status(404).json({ message: error.message });
  //     }
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // },
  //
};
