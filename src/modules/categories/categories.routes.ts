import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import * as categoriesController from "./categories.controller.js";
import { requireOwner } from "../../middlewares/role.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { createCategorySchema, updateCategorySchema, updateCategoryStatusSchema } from "./categories.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", categoriesController.listCategories);
router.post(
  "/",
  requireOwner,
  validateBody(createCategorySchema),
  categoriesController.createCategory,
);
router.patch(
  "/:id",
  requireOwner,
  validateBody(updateCategorySchema),
  categoriesController.updateCategory,
);
router.patch(
  "/:id/status",
  requireOwner,
  validateBody(updateCategoryStatusSchema),
  categoriesController.updateCategoryStatus,
);

export default router;