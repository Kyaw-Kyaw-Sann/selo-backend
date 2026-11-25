import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { createSaleSchema } from "./sales.schema.js";
import * as salesController from './sales.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', salesController.listSales)
router.post("/", validateBody(createSaleSchema), salesController.createSale);
router.get('/:id', salesController.getSaleById)

export default router;
