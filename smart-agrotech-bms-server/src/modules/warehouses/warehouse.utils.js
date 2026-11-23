import { Warehouse } from "./warehouse.model.js";

// Follows the existing customer public-ID sequence convention.
export const generateWarehousePublicId = async () => {
  const lastWarehouse = await Warehouse.findOne()
    .sort({ createdAt: -1 })
    .select("publicId")
    .setOptions({ withDeleted: true });

  if (!lastWarehouse) return "WH-100001";
  const lastNumber = Number(String(lastWarehouse.publicId).replace(/^WH-/, ""));
  if (!Number.isFinite(lastNumber)) throw new Error("Cannot generate the next warehouse public ID from the latest record.");
  return `WH-${String(lastNumber + 1).padStart(6, "0")}`;
};
