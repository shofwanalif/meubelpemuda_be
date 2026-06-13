import { Router } from "express";
import {
  authenticate,
  requireRole,
  requireAssignedBranchForKaryawan,
} from "../../middleware/auth.middleware";
import { categoryController } from "./category.controller";
import { validate } from "../../middleware/validation.middleware";
import { CreateCategorySchema, UpdateCategorySchema } from "./category.schema";

const categoryRouter = Router();

categoryRouter.post(
  "/create",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  validate(CreateCategorySchema),
  categoryController.createCategory,
);

categoryRouter.put(
  "/update/:id",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  validate(UpdateCategorySchema),
  categoryController.updateCategory,
);

categoryRouter.delete(
  "/delete/:id",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  categoryController.deleteCategory,
);

categoryRouter.get(
  "/",
  authenticate,
  requireRole(["owner", "karyawan"]),
  requireAssignedBranchForKaryawan,
  categoryController.getCategories,
);

export default categoryRouter;
