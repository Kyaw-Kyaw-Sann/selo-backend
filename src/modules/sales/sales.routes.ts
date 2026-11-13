import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import * as salesController from './sales.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', salesController.listSales)
router.get('/:id', salesController.getSaleById)

export default router;