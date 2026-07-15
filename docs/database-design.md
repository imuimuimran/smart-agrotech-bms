# Smart AgroTech Business Management System (BMS)

# Database Design Document

---

# Database

MongoDB Atlas

Database Name:

smart_agrotech_bms

---

# Design Principles

The database is designed to:

- Prevent duplicate data
- Maintain referential integrity
- Support role-based access
- Keep inventory consistent
- Track financial transactions
- Record complete audit history
- Scale for future multi-branch support

---

# Naming Convention

Collections

camelCase

Examples

users

products

salePayments

purchasePayments

inventoryLogs

Fields

camelCase

Examples

createdAt

updatedAt

purchasePrice

sellingPrice

customerId

supplierId

---

# Common Fields

Every collection should contain:

_id

createdAt

updatedAt

createdBy

updatedBy

status

---

# Status Values

Most collections will use:

active

inactive

deleted (Soft Delete)

Archived records should not be permanently removed.

---

# Collections Overview

1. users
2. categories
3. products
4. suppliers
5. customers
6. purchases
7. purchasePayments
8. sales
9. salePayments
10. inventoryLogs
11. expenses
12. activityLogs
13. notifications
14. settings

---

# Collection Details

## Users

Purpose

Store application users.

Fields

- name
- email
- phone
- password
- role
- profileImage
- status
- lastLogin

Roles

- Admin
- Moderator

Indexes

email (unique)

---

## Categories

Fields

- name
- description
- status

Indexes

name (unique)

---

## Products

Fields

- name
- sku
- brand
- categoryId
- purchasePrice
- sellingPrice
- currentStock
- minimumStock
- image
- status

Indexes

sku (unique)

categoryId

name

---

## Suppliers

Fields

- name
- company
- phone
- email
- address
- notes

Indexes

phone

company

---

## Customers

Fields

- name
- phone
- email
- address
- notes

Indexes

phone

email

---

## Purchases

Fields

- purchaseNumber
- supplierId
- products
- subtotal
- discount
- totalAmount
- paidAmount
- dueAmount
- purchaseDate
- remarks

Indexes

purchaseNumber

supplierId

purchaseDate

---

## Purchase Payments

Fields

- purchaseId
- supplierId
- amount
- paymentMethod
- reference
- comment

Indexes

purchaseId

supplierId

---

## Sales

Fields

- invoiceNumber
- customerId
- products
- subtotal
- discount
- totalAmount
- paidAmount
- dueAmount
- saleDate

Indexes

invoiceNumber

customerId

saleDate

---

## Sale Payments

Fields

- saleId
- customerId
- amount
- paymentMethod
- reference
- comment

Indexes

saleId

customerId

---

## Inventory Logs

Fields

- productId
- type
- quantity
- previousStock
- currentStock
- referenceId
- referenceType
- remarks

Movement Types

purchase

sale

adjustment

Indexes

productId

type

createdAt

---

## Expenses

Fields

- category
- amount
- paymentMethod
- description
- expenseDate

Indexes

expenseDate

category

---

## Activity Logs

Fields

- userId
- module
- action
- description
- ipAddress
- device
- browser

Indexes

userId

module

createdAt

---

## Notifications

Fields

- title
- message
- type
- isRead
- userId

Notification Types

low_stock

customer_due

supplier_due

system

---

## Settings

Fields

- companyName
- companyLogo
- address
- phone
- email
- currency
- timezone
- invoicePrefix

---

# Relationship Diagram

Category

↓

Products

↓

Inventory Logs

Supplier

↓

Purchases

↓

Purchase Payments

↓

Inventory Logs

Customer

↓

Sales

↓

Sale Payments

↓

Inventory Logs

Users

↓

Activity Logs

Users

↓

Notifications

---

# Inventory Rules

Stock MUST NEVER be edited directly.

Allowed operations:

Purchase

Current Stock

+ Purchased Quantity

Sale

Current Stock

- Sold Quantity

Adjustment

Admin Only

Every stock movement creates an Inventory Log.

No exception.

---

# Financial Rules

Purchase

Total Amount

↓

Paid Amount

↓

Due Amount

Sale

Total Amount

↓

Paid Amount

↓

Due Amount

Customer payments reduce customer due.

Supplier payments reduce supplier due.

Historical payment records are never deleted.

---

# Soft Delete Policy

Important collections use soft delete.

Instead of deleting records:

status = "deleted"

This protects:

Historical reports

Sales history

Purchase history

Activity logs

Financial records

---

# Future Version Support

The database is designed for:

- Multi-Branch Support
- Warehouse Management
- Barcode System
- QR Code System
- Mobile App
- SMS Gateway
- WhatsApp Integration
- AI Analytics
- Online Ordering