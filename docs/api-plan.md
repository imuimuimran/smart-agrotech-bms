# Smart AgroTech Business Management System (BMS)

# API Design Specification

---

# API Version

All endpoints will use versioning.

Base URL

/api/v1

Example

GET /api/v1/products

POST /api/v1/auth/login

---

# Response Format

Every API should return a consistent response.

Success Response

{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}

Error Response

{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}

---

# HTTP Status Codes

200 OK

201 Created

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error

---

# Authentication

Authentication uses JWT.

Workflow

Login

↓

Server verifies credentials

↓

JWT generated

↓

Token returned

↓

Client stores token

↓

Protected requests include token

Authorization Header

Authorization: Bearer <token>

---

# Authorization

Roles

Admin

Moderator

Protected middleware

verifyToken()

verifyAdmin()

verifyModerator()

---

# Pagination

Supported Query Parameters

?page=1

?limit=10

Example

GET /api/v1/products?page=2&limit=20

Response

{
  "page": 2,
  "limit": 20,
  "totalPages": 8,
  "totalRecords": 145,
  "data": []
}

---

# Searching

Example

GET /api/v1/products?search=tiller

Searchable Fields

Products

Customers

Suppliers

Users

---

# Filtering

Examples

Category

GET /api/v1/products?category=Power%20Tillers

Status

GET /api/v1/products?status=active

Date Range

GET /api/v1/sales?startDate=2026-01-01&endDate=2026-01-31

---

# Sorting

Example

GET /api/v1/products?sort=name

Descending

GET /api/v1/products?sort=-createdAt

---

# Authentication Endpoints

POST /auth/register

POST /auth/login

POST /auth/logout

GET /auth/me

PATCH /auth/change-password

POST /auth/forgot-password (Future)

POST /auth/reset-password (Future)

---

# User Endpoints

GET /users

GET /users/:id

POST /users

PATCH /users/:id

DELETE /users/:id

---

# Category Endpoints

GET /categories

GET /categories/:id

POST /categories

PATCH /categories/:id

DELETE /categories/:id

---

# Product Endpoints

GET /products

GET /products/:id

POST /products

PATCH /products/:id

DELETE /products/:id

---

# Supplier Endpoints

GET /suppliers

GET /suppliers/:id

POST /suppliers

PATCH /suppliers/:id

DELETE /suppliers/:id

---

# Purchase Endpoints

GET /purchases

GET /purchases/:id

POST /purchases

PATCH /purchases/:id

DELETE /purchases/:id

POST /purchases/:id/payment

GET /purchases/:id/payments

---

# Customer Endpoints

GET /customers

GET /customers/:id

POST /customers

PATCH /customers/:id

DELETE /customers/:id

---

# Sales Endpoints

GET /sales

GET /sales/:id

POST /sales

PATCH /sales/:id

DELETE /sales/:id

POST /sales/:id/payment

GET /sales/:id/payments

---

# Inventory Endpoints

GET /inventory

GET /inventory/logs

GET /inventory/low-stock

GET /inventory/out-of-stock

POST /inventory/adjustment

---

# Expense Endpoints

GET /expenses

GET /expenses/:id

POST /expenses

PATCH /expenses/:id

DELETE /expenses/:id

---

# Dashboard Endpoints

GET /dashboard/summary

GET /dashboard/sales-chart

GET /dashboard/purchase-chart

GET /dashboard/revenue-chart

GET /dashboard/expense-chart

---

# Reports Endpoints

GET /reports/sales

GET /reports/purchases

GET /reports/inventory

GET /reports/customer-dues

GET /reports/supplier-dues

GET /reports/expenses

GET /reports/profit-loss

---

# Activity Log Endpoints

GET /activity-logs

GET /activity-logs/:id

---

# Notification Endpoints

GET /notifications

PATCH /notifications/:id/read

PATCH /notifications/read-all

---

# Settings Endpoints

GET /settings

PATCH /settings

---

# Validation Rules

Every POST and PATCH request must validate:

Required fields

Correct data types

Business rules

Duplicate constraints

Validation errors return

422 Unprocessable Entity

---

# Security Rules

Passwords must be hashed.

JWT required for protected routes.

Only Admin can:

Manage users

Manage settings

Delete critical records

Moderators cannot elevate privileges.

---

# API Naming Rules

Use plural resource names.

Examples

/products

/customers

/sales

Use kebab-case only when necessary.

Use nouns instead of verbs.

Good

GET /products

Bad

GET /getProducts

---

# Future API Versioning

Current

/api/v1

Future

/api/v2

Older versions remain supported until deprecated.