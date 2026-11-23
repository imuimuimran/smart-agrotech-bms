import { z } from "zod";
import { WAREHOUSE_SORTABLE_FIELDS, WAREHOUSE_STATUS } from "./warehouse.constants.js";

const createWarehouseBodySchema = z.object({
  warehouseName: z.string().trim().min(2).max(150),
  warehouseCode: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/, "Warehouse code may contain letters, numbers, hyphens, and underscores only."),
  description: z.string().trim().max(500).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  contactPerson: z.string().trim().max(100).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  status: z.enum(Object.values(WAREHOUSE_STATUS)).default(WAREHOUSE_STATUS.ACTIVE),
}).strict();

export const createWarehouseSchema = z.object({ body: createWarehouseBodySchema });

export const getWarehousesQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),

    page: z.coerce.number().int().min(1).optional(),

    limit: z.coerce.number().int().min(1).optional(),

    sortBy: z
      .string()
      .refine(
        (value) => WAREHOUSE_SORTABLE_FIELDS.includes(value),
        "Invalid warehouse sort field."
      )
      .optional(),

    sortOrder: z.enum(["asc", "desc"]).optional(),
  }).strict(),
});