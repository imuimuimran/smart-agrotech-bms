import { Router } from "express";

import verifyToken from "../../middlewares/auth.middleware.js"

import authorize from "../../middlewares/authorize.middleware.js";

import validateRequest from "../../middlewares/validate.middleware.js";

import ROLES from "../../constants/roles.js";

import {
  createCustomerSchema,
} from "./customer.validation.js";

import {
  CustomerController,
} from "./customer.controller.js";

const router = Router();

// Create a Customer
router.post(
  "/",

  verifyToken,

  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR
  ),

  validateRequest(
    createCustomerSchema
  ),

  CustomerController.createCustomer
);

// Get All Customers (List)
router.get(
    "/",

    verifyToken,

    authorize(

        ROLES.ADMIN,

        ROLES.MODERATOR,

        ROLES.SALES

    ),

    CustomerController
        .getCustomers
);

// Get Single Customer (New Route Added Here)
router.get(
  "/:publicId",

  verifyToken,

  authorize(
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.SALES
  ),

  CustomerController.getCustomer
);

export default router;