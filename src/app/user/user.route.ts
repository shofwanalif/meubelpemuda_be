import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate, requireRole } from "../../middleware/auth.middleware";

const userRouter = Router();

userRouter.post(
  "/create-user",
  authenticate,
  requireRole(["owner"]),
  userController.createUser,
);

userRouter.post(
  "/assign-branch",
  authenticate,
  requireRole(["owner"]),
  userController.assignBranch,
);

userRouter.get(
  "/list-users",
  authenticate,
  requireRole(["owner"]),
  userController.getListUsers,
);

export default userRouter;
