import express from 'express'
import cors from 'cors'
import { errorMiddleware } from './middlewares/error.middleware.js'
import { csrfProtection } from './middlewares/csrf.middleware.js'
import { env } from './config/env.js'
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
import salesRoutes from "./modules/sales/sales.routes.js"


const app = express()

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Selo-Request"],
  }),
);

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
app.use("/api/purchases", purchasesRoutes);
app.use("/api/sales", salesRoutes);

app.get('/health', (_req, res)=>{
    res.status(200).json({
        success: true,
        message: "Server is healthy",
        data: null
    })
})

app.use((_req, _res, next)=>{
    next(new AppError("Route not found", 404, "NOT_FOUND"))
})

// Error middleware must be registered last.
app.use(errorMiddleware)

export default app
