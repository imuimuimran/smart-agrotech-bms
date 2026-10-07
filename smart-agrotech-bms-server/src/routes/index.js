import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";

import userRoutes from "../modules/users/user.routes.js";

import customerRoutes from "../modules/customers/customer.routes.js";

import { SupplierRoutes } from "../modules/suppliers/supplier.routes.js";

import productCategoryRoutes from "../modules/product-categories/productCategory.routes.js";

import brandRoutes from "../modules/brands/brand.routes.js";

import productRoutes from "../modules/products/product.routes.js";

import { purchaseReturnRoutes } from "../modules/purchases/purchaseReturn.routes.js";

import { saleRoutes } from "../modules/sales/sale.routes.js";

import { saleReturnRoutes } from "../modules/sales/saleReturn.routes.js";

import { returnFinancialReconciliationRoutes } from "../modules/accounting/returnFinancialReconciliation.routes.js";

import expenseRoutes from "../modules/expenses/expense.routes.js";

import { ReportRoutes } from "../modules/reports/report.routes.js";

import { ActivityLogRoutes } from "../modules/activity-logs/activityLog.routes.js";

const router = Router();

router.use("/auth", authRoutes);

router.use("/users", userRoutes);

router.use("/customers", customerRoutes);

router.use("/suppliers", SupplierRoutes);

router.use("/product-categories", productCategoryRoutes);

router.use("/brands", brandRoutes);

router.use("/products", productRoutes);

router.use("/purchases", purchaseReturnRoutes);

router.use("/sales", saleRoutes);

router.use("/sales", saleReturnRoutes);

router.use("/accounting", returnFinancialReconciliationRoutes);

router.use("/expenses", expenseRoutes);

router.use("/reports", ReportRoutes);

router.use("/activity-logs", ActivityLogRoutes);

export default router;