import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireOwner } from "../../middlewares/role.middleware.js";
import * as purchaseController from './purchases.controller.js'
import { validateBody } from "../../middlewares/validate.middleware.js";
import { createPurchseSchema } from "./purchases.schema.js";

const router = Router()

router.use(requireAuth, requireOwner)

router.get('/', purchaseController.listPurchases)
router.get('/:id', purchaseController.getPurchaseById)
router.post(
  "/",
  validateBody(createPurchseSchema),
  purchaseController.createPurchase,
);

export default router