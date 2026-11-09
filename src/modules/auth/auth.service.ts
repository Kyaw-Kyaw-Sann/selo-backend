import { env } from "../../config/env.js";
import { AppError } from "../../utils/app.error.js";
import { AUTH_TOKEN_TTL_SECONDS } from "./auth.config.js";
import { getUserByUsername } from "./auth.repository.js";
import type { LoginInput } from "./auth.schema.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function login(input: LoginInput){

    const user = await getUserByUsername(input.username)

    if(!user || !user.is_active){
        throw new AppError(
            "Invalid username or password",
            401,
            "INVALID_CREDENTIALS"
        )
    }

    const passwordMatch = await bcrypt.compare(
        input.password, user.password_hash
    )

    if(!passwordMatch){
        throw new AppError(
            "Invalid username or password",
            401,
            "INVALID_CREDENTIALS"
        )
    }

    const token = jwt.sign({}, env.JWT_SECRET, {
        subject: user.id,
        algorithm: "HS256",
        expiresIn: AUTH_TOKEN_TTL_SECONDS
    })

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
        }
    }

}