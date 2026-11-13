import express from 'express'
import { errorMiddleware } from './middlewares/error.middleware.js'
import { AppError } from './utils/app.error.js'
import cookieParser from 'cookie-parser'
import authRoutes from './modules/auth/auth.routes.js'
import userRoutes from './modules/users/users.routes.js'
import unitRoutes from './modules/units/units.routes.js'
import categoriesRoutes from "./modules/categories/categories.routes.js";
import productsRoutes from "./modules/products/products.routes.js";
import suppliersRoutes from './modules/suppliers/suppliers.routes.js';
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import purchasesRoutes from "./modules/purchases/purchases.routes.js"
import { csrfProtection } from './middlewares/csrf.middleware.js'

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use("/api", csrfProtection);

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/units', unitRoutes)
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/suppliers", suppliersRoutes)
app.use("/api/inventory", inventoryRoutes);
app.use("/api/purchases", purchasesRoutes)

app.get('/health', (_req, res)=>{
    res.status(200).json({
        success: true,
        message: "Server is healthy"
    })
})

app.use((_req, _res, next)=>{
    next(new AppError("Route Not Found", 404, "NOT_FOUND"))
})

// Error middleware must be registered last.
app.use(errorMiddleware)

export default app
