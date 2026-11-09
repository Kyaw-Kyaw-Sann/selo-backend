import { Router } from "express"
import * as authController from "./auth.controller.js"
import { validateBody } from "../../middlewares/validate.middleware.js"
import { loginSchema } from "./auth.schema.js"
import { requireAuth } from "../../middlewares/auth.middleware.js"

const router = Router()

router.post('/login', validateBody(loginSchema), authController.login)
router.get('/me', requireAuth, authController.me)
router.post('/logout', requireAuth, authController.logout)

export default router