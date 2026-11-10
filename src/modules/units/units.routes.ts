import { Router } from 'express'
import * as unitsController from './units.controller.js'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireOwner } from '../../middlewares/role.middleware.js'
import { validateBody } from '../../middlewares/validate.middleware.js'
import { createUnitSchema, updateUnitSchema, updateUnitStatusScheme } from './units.schema.js'

const router = Router()

router.use(requireAuth)

router.get('/', unitsController.listUnits )
router.post('/', requireOwner, validateBody(createUnitSchema), unitsController.createUnit)
router.patch('/:id', requireOwner, validateBody(updateUnitSchema), unitsController.updateUnit)
router.patch('/:id/status', requireOwner, validateBody(updateUnitStatusScheme), unitsController.updateUnitStatus)

export default router