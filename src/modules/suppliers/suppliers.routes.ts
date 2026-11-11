import { Router } from "express";
import { requireOwner } from "../../middlewares/role.middleware.js";
import * as suppliersController from "./suppliers.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import {
  createSupplierSchema,
  updateSupplierSchema,
  updateSupplierStatusSchema,
} from "./suppliers.schema.js";

const router = Router();

router.use(requireAuth, requireOwner);

router.get("/", suppliersController.listSuppliers);
router.get("/:id", suppliersController.getSupplierById);
router.post(
  "/",
  validateBody(createSupplierSchema),
  suppliersController.createSupplier,
);
router.patch(
  "/:id",
  validateBody(updateSupplierSchema),
  suppliersController.updateSupplier,
);
router.patch(
  "/:id/status",
  validateBody(updateSupplierStatusSchema),
  suppliersController.updateSupplierStatus,
);

export default router;
