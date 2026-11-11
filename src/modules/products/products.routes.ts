import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireOwner } from "../../middlewares/role.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { createProductSchema, updateProductSchema, updateProductStatusSchema } from "./products.schema.js";
import * as productsController from "./products.controller.js";

const router = Router();

router.use(requireAuth);
router.get("/", productsController.listProducts);
router.get("/:id", productsController.getProductById);
router.post("/", requireOwner, validateBody(createProductSchema), productsController.createProduct);
router.patch("/:id", requireOwner, validateBody(updateProductSchema), productsController.updateProduct);
router.patch("/:id/status", requireOwner, validateBody(updateProductStatusSchema), productsController.updateProductStatus);

export default router;
