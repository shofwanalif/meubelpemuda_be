import { Router } from "express";
import { branchController } from "./branch.controller";
import { authenticate, requireRole } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { CreateBranchDto, UpdateBranchDto } from "../branches/branch.schema";

const branchRouter = Router();

branchRouter.post(
  "/create-branch",
  authenticate,
  requireRole(["owner"]),
  validate(CreateBranchDto),
  branchController.createBranch,
);

branchRouter.get(
  "/get-all-branches",
  authenticate,
  requireRole(["owner"]),
  branchController.getAllBranches,
);

branchRouter.put(
  "/update-branch/:id",
  authenticate,
  requireRole(["owner"]),
  validate(UpdateBranchDto),
  branchController.updateBranch,
);

branchRouter.delete(
  "/delete-branch/:id",
  authenticate,
  requireRole(["owner"]),
  branchController.deleteBranch,
);

branchRouter.get(
  "/search-branch",
  authenticate,
  requireRole(["owner"]),
  branchController.searchBranch,
);

export default branchRouter;
