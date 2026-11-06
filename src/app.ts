import express from 'express'
import { errorMiddleware } from './middlewares/error.middleware.js'
import { AppError } from './utils/app.error.js'

const app = express()

app.use(express.json())

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