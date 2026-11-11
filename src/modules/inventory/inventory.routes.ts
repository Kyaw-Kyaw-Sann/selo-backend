import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import * as inventoryController from "./inventory.controller.js";
import { requireOwner } from "../../middlewares/role.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { createAdjustmentSchema } from "./inventory.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", inventoryController.listInventory);
router.get(
  "/movements",
  requireOwner,
  inventoryController.listMovements,
);
router.get(
  "/movements/:id",
  requireOwner,
  inventoryController.getMovementById,
);
router.post(
  "/adjustments",
  requireOwner,
  validateBody(createAdjustmentSchema),
  inventoryController.createAdjustment,
);

export default router;