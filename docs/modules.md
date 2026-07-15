# Smart AgroTech Business Management System (BMS)

# Module Specification

---

# Module 1: Authentication

## Purpose

Provide secure access to the system.

## Features

- Login
- Logout
- JWT Authentication
- Protected Routes
- Role-Based Authorization
- Change Password
- Forgot Password (Future)

## Accessible By

- Admin
- Moderator

---

# Module 2: Dashboard

## Purpose

Provide a quick overview of business performance.

## Dashboard Cards

- Total Products
- Total Categories
- Current Inventory Value
- Today's Sales
- Monthly Sales
- Customer Due
- Supplier Due
- Monthly Expenses
- Net Profit
- Low Stock Products

## Dashboard Charts

- Sales Trend
- Purchase Trend
- Revenue Trend
- Expense Trend

## Quick Actions

- Add Product
- Create Purchase
- Create Sale
- Record Customer Payment
- Record Supplier Payment

## Accessible By

- Admin
- Moderator (limited)

---

# Module 3: User Management

## Purpose

Manage application users.

## Features

- Create Moderator
- Update Moderator
- Deactivate User
- Activate User
- View User List
- Search Users

## User Fields

- Name
- Email
- Phone
- Role
- Status
- Profile Photo

## Accessible By

- Admin Only

---

# Module 4: Product Management

## Purpose

Manage all products.

## Features

- Add Product
- Update Product
- Delete Product
- View Product
- Search Product
- Filter Product
- Upload Product Image

## Product Fields

- Product Name
- SKU
- Category
- Brand
- Purchase Price
- Selling Price
- Current Stock (Read Only)
- Minimum Stock
- Image
- Status

## Accessible By

- Admin
- Moderator

---

# Module 5: Category Management

## Features

- Add Category
- Update Category
- Delete Category
- View Categories

## Fields

- Category Name
- Description
- Status

---

# Module 6: Supplier Management

## Features

- Add Supplier
- Update Supplier
- Delete Supplier
- Supplier Profile
- Purchase History
- Payment History
- Due History
- Notes

## Fields

- Name
- Company
- Phone
- Email
- Address
- Notes

---

# Module 7: Purchase Management

## Features

- Create Purchase
- View Purchases
- Purchase Details
- Purchase Invoice
- Supplier Payment
- Purchase History

## Purchase Fields

- Supplier
- Products
- Quantity
- Unit Price
- Total Amount
- Paid Amount
- Due Amount
- Invoice Number
- Purchase Date

---

# Module 8: Inventory Management

## Purpose

Track stock automatically.

## Features

- Current Stock
- Inventory Logs
- Stock Movement
- Low Stock Alert
- Out Of Stock Alert

## Inventory Rules

Stock should NEVER be edited manually.

Stock changes ONLY through:

- Purchase
- Sale
- Adjustment (Admin)

---

# Module 9: Customer Management

## Features

- Add Customer
- Update Customer
- Customer Profile
- Purchase History
- Due History
- Payment History
- Notes

## Customer Fields

- Name
- Phone
- Email
- Address
- Notes

---

# Module 10: Sales Management

## Features

- Create Sale
- View Sales
- Sales Invoice
- Customer Payment
- Sales History

## Sales Fields

- Invoice Number
- Customer
- Products
- Quantity
- Discount
- Total Amount
- Paid Amount
- Due Amount

---

# Module 11: Customer Due Management

## Features

- View Customer Dues
- Record Payment
- Payment History
- Outstanding Balance
- Comments

## Dashboard Information

- Total Receivable
- Overdue Customers
- Recent Payments

---

# Module 12: Supplier Due Management

## Features

- View Supplier Dues
- Record Payment
- Payment History
- Outstanding Balance
- Comments

## Dashboard Information

- Total Payable
- Upcoming Payments
- Recent Supplier Payments

---

# Module 13: Expense Management

## Features

- Add Expense
- Update Expense
- Delete Expense
- Expense Categories
- Expense History

## Fields

- Expense Type
- Amount
- Date
- Description
- Created By

---

# Module 14: Reporting

## Reports

### Sales

- Daily
- Monthly
- Yearly
- Custom

### Purchases

- Daily
- Monthly
- Yearly

### Inventory

- Current Stock
- Inventory Movement
- Low Stock

### Financial

- Profit & Loss
- Revenue
- Expenses

### Due Reports

- Customer Due
- Supplier Due

## Export

- PDF
- Excel

---

# Module 15: Activity Logs

## Purpose

Maintain complete audit history.

## Logged Information

- User
- Action
- Module
- Timestamp
- IP Address (Future)

Example

Admin created Product

Moderator created Sale

Admin recorded Payment

---

# Module 16: Notifications

## Features

- Low Stock Alert
- Customer Payment Reminder
- Supplier Payment Reminder
- System Notifications

Future

- SMS
- WhatsApp
- Email Notifications

---

# Module 17: Settings

## Features

- Company Information
- Business Logo
- Invoice Settings
- Currency
- Time Zone
- Backup Settings

Admin Only

---

# Module Relationships

Authentication

↓

User Management

↓

Products
Categories

↓

Suppliers

↓

Purchases

↓

Inventory

↓

Customers

↓

Sales

↓

Customer Due

↓

Supplier Due

↓

Expenses

↓

Reports

↓

Activity Logs

↓

Notifications

---

# Development Priority

Phase 1

- Authentication
- User Management

Phase 2

- Categories
- Products

Phase 3

- Suppliers
- Purchases
- Inventory

Phase 4

- Customers
- Sales
- Due Management

Phase 5

- Expenses
- Dashboard
- Reports

Phase 6

- Activity Logs
- Notifications
- Deployment