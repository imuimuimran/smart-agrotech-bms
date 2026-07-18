import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";

import env from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";
import notFoundMiddleware from "./middlewares/notFound.middleware.js";
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

/**
 * Security Middleware
 */
app.use(helmet());
app.use(hpp());
app.use(mongoSanitize());

/**
 * Performance Middleware
 */
app.use(compression());

/**
 * CORS
 */
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

/**
 * Body Parser
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Cookie Parser
 */
app.use(cookieParser());

/**
 * Logger
 */
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

/**
 * Health Check
 */
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Smart AgroTech BMS API is running.",
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use("/api/v1/auth", authRoutes); // 2. Add this route mounting here

/**

/**
 * 404 Middleware
 */
app.use(notFoundMiddleware);

/**
 * Global Error Handler
 */
app.use(errorMiddleware);

export default app;