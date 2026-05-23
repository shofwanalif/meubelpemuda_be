import { Router } from "express";
import { productController } from "./product.controller";
import {
  authenticate,
  requireRole,
  requireAssignedBranchForKaryawan,
} from "../../middleware/auth.middleware";

const productRouter = Router();

productRouter.get(
  "/",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  productController.getProducts,
);

productRouter.post(
  "/create",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan, // tolak karyawan yg belum di-assign cabang
  productController.createProduct,
);

productRouter.put(
  "/update/:id",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  productController.updateProduct,
);

productRouter.delete(
  "/delete/:id",
  authenticate,
  requireRole(["owner"]),
  productController.deleteProduct,
);

productRouter.patch(
  "/deactivate/:id",
  authenticate,
  requireRole(["owner"]),
  productController.deactivateProduct,
);

productRouter.patch(
  "/activate/:id",
  authenticate,
  requireRole(["owner"]),
  productController.activateProduct,
);

// productRouter.get(
//   "/:id",
//   authenticate,
//   requireRole(["owner", "karyawan"]),
//   productController.getProductById,
// );

export default productRouter;
