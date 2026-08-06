import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";

import userRoutes from "../modules/users/user.routes.js";

import customerRoutes from "../modules/customers/customer.routes.js";

import { SupplierRoutes } from "../modules/suppliers/supplier.routes.js";

import productCategoryRoutes from "../modules/product-categories/productCategory.routes.js";

import brandRoutes from "../modules/brands/brand.routes.js";

const router = Router();

router.use("/auth", authRoutes);

router.use("/users", userRoutes);

router.use("/customers", customerRoutes);

router.use("/suppliers", SupplierRoutes);

router.use("/product-categories", productCategoryRoutes);

router.use("/brands", brandRoutes);

export default router;