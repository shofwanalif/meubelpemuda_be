import { Request, Response } from "express";
import { logger } from "../../config/logging";
import {
  productService,
  UpdateProductInput,
  PriceInput,
} from "./product.service";
import {
  OwnerCreateProductSchema,
  KaryawanCreateProductSchema,
  OwnerUpdateProductSchema,
  KaryawanUpdateProductSchema,
  GetProductsQuerySchema,
} from "./product.schema";

export const productController = {
  async createProduct(req: Request, res: Response) {
    try {
      const user = (req as any).session.user;
      const role = user.role;

      if (role === "owner") {
        const result = OwnerCreateProductSchema.safeParse(req.body);
        if (!result.success) {
          logger.error(result.error.flatten().fieldErrors);
          return res.status(400).json({
            error: "Validation Error",
            details: result.error.flatten().fieldErrors,
          });
        }

        const { name, description, unit, prices } = result.data;

        const product = await productService.createProduct(
          { name, description: description ?? null, unit, prices },
          user.id,
        );

        return res.status(201).json({
          message: "Produk berhasil dibuat",
          data: product,
        });
      }

      if (role === "karyawan") {
        const result = KaryawanCreateProductSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            error: "Validation Error",
            details: result.error.flatten().fieldErrors,
          });
        }

        const { name, description, unit, costPrice, sellPrice } = result.data;

        // branchId sudah di-inject oleh middleware requireAssignedBranchForKaryawan
        const employeeBranch = (req as any).employeeBranch;

        const product = await productService.createProduct(
          {
            name,
            description: description ?? null,
            unit,
            prices: [
              {
                branchId: employeeBranch.branchId as string,
                costPrice,
                sellPrice,
              },
            ],
          },
          user.id,
        );

        return res.status(201).json({
          message: "Produk berhasil dibuat",
          data: product,
        });
      }

      return res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      logger.error("Error creating product: ", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async updateProduct(req: Request<{ id: string }>, res: Response) {
    try {
      const user = req.session!.user;
      const role = user.role;
      const productId = req.params.id;

      if (!productId) {
        return res.status(400).json({ message: "Product ID harus diisi" });
      }

      if (role === "owner") {
        const result = OwnerUpdateProductSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            error: "Validation Error",
            details: result.error.flatten().fieldErrors,
          });
        }

        const data = result.data;

        // Build productInfo hanya dari field yang didefinisikan
        const productInfo: {
          name?: string;
          description?: string | null;
          unit?: string;
        } = {};
        if (data.name !== undefined) productInfo.name = data.name;
        if (data.description !== undefined)
          productInfo.description = data.description;
        if (data.unit !== undefined) productInfo.unit = data.unit;

        const updateInput: UpdateProductInput = {};
        if (Object.keys(productInfo).length > 0)
          updateInput.productInfo = productInfo;
        if (data.prices !== undefined) {
          updateInput.prices = data.prices.map(
            (p): PriceInput => ({
              branchId: p.branchId ?? null,
              costPrice: p.costPrice,
              sellPrice: p.sellPrice,
            }),
          );
        }

        const product = await productService.updateProduct(
          productId,
          updateInput,
          user.id,
        );

        return res.status(200).json({
          message: "Produk berhasil diupdate",
          data: product,
        });
      }

      if (role === "karyawan") {
        const result = KaryawanUpdateProductSchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            error: "Validation Error",
            details: result.error.flatten().fieldErrors,
          });
        }

        const data = result.data;

        // Build productInfo hanya dari field yang didefinisikan
        const productInfo: {
          name?: string;
          description?: string | null;
          unit?: string;
        } = {};
        if (data.name !== undefined) productInfo.name = data.name;
        if (data.description !== undefined)
          productInfo.description = data.description;
        if (data.unit !== undefined) productInfo.unit = data.unit;

        const updateInput: UpdateProductInput = {};
        if (Object.keys(productInfo).length > 0)
          updateInput.productInfo = productInfo;
        // costPrice & sellPrice sudah dipastikan berpasangan oleh schema
        if (data.costPrice !== undefined && data.sellPrice !== undefined) {
          updateInput.prices = [
            {
              branchId: req.employeeBranch!.branchId,
              costPrice: data.costPrice,
              sellPrice: data.sellPrice,
            },
          ];
        }

        const product = await productService.updateProduct(
          productId,
          updateInput,
          user.id,
        );

        return res.status(200).json({
          message: "Produk berhasil diupdate",
          data: product,
        });
      }

      return res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      logger.error("Error updating product: ", error);
      if (
        error instanceof Error &&
        error.message === "Produk tidak ditemukan"
      ) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async deleteProduct(req: Request<{ id: string }>, res: Response) {
    try {
      const productId = req.params.id;
      if (!productId) {
        return res.status(400).json({ message: "Product ID harus disertakan" });
      }

      await productService.deleteProduct(productId);
      return res.status(200).json({ message: "Produk berhasil dihapus" });
    } catch (error) {
      logger.error("Error deleting product: ", error);
      if (error instanceof Error) {
        // "Produk tidak ditemukan" → 404
        const isNotFound = error.message === "Produk tidak ditemukan";
        return res
          .status(isNotFound ? 404 : 409)
          .json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async deactivateProduct(req: Request<{ id: string }>, res: Response) {
    try {
      const productId = req.params.id;
      if (!productId) {
        return res.status(400).json({ message: "Product ID harus disertakan" });
      }

      const product = await productService.deactivateProduct(productId);
      return res
        .status(200)
        .json({ message: "Produk berhasil dinonaktifkan", data: product });
    } catch (error) {
      logger.error("Error deactivating product: ", error);
      if (
        error instanceof Error &&
        error.message === "Produk tidak ditemukan"
      ) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async activateProduct(req: Request<{ id: string }>, res: Response) {
    try {
      const productId = req.params.id;
      if (!productId) {
        return res.status(400).json({ message: "Product ID harus disertakan" });
      }

      const product = await productService.activateProduct(productId);
      return res
        .status(200)
        .json({ message: "Produk berhasil diaktifkan", data: product });
    } catch (error) {
      logger.error("Error activating product: ", error);
      if (
        error instanceof Error &&
        error.message === "Produk tidak ditemukan"
      ) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async getProducts(req: Request, res: Response) {
    try {
      const user = req.session!.user;
      const role = user.role;

      // Validasi query params (page, pageSize, search)
      const query = GetProductsQuerySchema.safeParse(req.query);
      if (!query.success) {
        return res.status(400).json({
          error: "Validation Error",
          details: logger.error(query.error.flatten().fieldErrors),
        });
      }

      const { page, pageSize, search } = query.data;

      if (role === "owner") {
        const result = await productService.getProducts({
          role: "owner",
          page,
          pageSize,
          search,
        });
        return res.status(200).json({ message: "Success", ...result });
      }

      if (role === "karyawan") {
        const result = await productService.getProducts({
          role: "karyawan",
          page,
          pageSize,
          branchId: req.employeeBranch!.branchId,
          search,
        });
        return res.status(200).json({ message: "Success", ...result });
      }

      return res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      logger.error("Error getting products: ", error);
      return res.status(500).json({ message: "Internal server error" });
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
