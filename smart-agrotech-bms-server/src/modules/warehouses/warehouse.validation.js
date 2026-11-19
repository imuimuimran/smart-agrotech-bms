import { z } from "zod";
import { WAREHOUSE_SORTABLE_FIELDS } from "./warehouse.constants.js";

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