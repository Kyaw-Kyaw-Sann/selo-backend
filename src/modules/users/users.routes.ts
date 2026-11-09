import { Router } from "express";
import * as userController from "./users.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireOwner } from "../../middlewares/role.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "./users.schema.js";

const router = Router();

router.use(requireAuth, requireOwner);

router.get("/", userController.listUsers);
router.get("/:id", userController.getUserById);
router.post("/", validateBody(createUserSchema), userController.createUser);
router.patch("/:id", validateBody(updateUserSchema), userController.updateUser);
router.patch(
  "/:id/status",
  validateBody(updateUserStatusSchema),
  userController.updateUserStatus,
);

export default router;
