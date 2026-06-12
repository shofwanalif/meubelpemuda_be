import { Router } from "express";
import { productController } from "./product.controller";
import {
  authenticate,
  requireRole,
  requireAssignedBranchForKaryawan,
} from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { CreateProductSchema, UpdateProductSchema } from "./product.schema";

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
  requireAssignedBranchForKaryawan,
  validate(CreateProductSchema),
  productController.createProduct,
);

productRouter.patch(
  "/update/:id",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  validate(UpdateProductSchema),
  productController.updateProduct,
);

productRouter.delete(
  "/delete/:id",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  productController.deleteProduct,
);

// productRouter.patch(
//   "/deactivate/:id",
//   authenticate,
//   requireRole(["owner"]),
//   validate(UpdateProductSchema),
//   productController.deactivateProduct,
// );

// productRouter.patch(
//   "/activate/:id",
//   authenticate,
//   requireRole(["owner"]),
//   productController.activateProduct,
// );

// productRouter.get(
//   "/:id",
//   authenticate,
//   requireRole(["owner", "karyawan"]),
//   productController.getProductById,
// );

export default productRouter;
