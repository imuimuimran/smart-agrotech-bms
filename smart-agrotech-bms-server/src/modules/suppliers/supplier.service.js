import Supplier from './supplier.model.js';
import QueryBuilder from "../../builder/QueryBuilder.js";
import { generateSupplierPublicId, sanitizeSupplier } from './supplier.utils.js';
import { SUPPLIER_STATUS, SUPPLIER_SEARCHABLE_FIELDS, SUPPLIER_FILTERABLE_FIELDS } from './supplier.constants.js';

const createSupplier = async (supplierData, userId) => {
  const publicId = await generateSupplierPublicId();
  
  const finalData = {
    ...supplierData,
    publicId,
    supplierCode: publicId,
    createdBy: userId,
  };

  const result = await Supplier.create(finalData);
  return sanitizeSupplier(result);
};

const getSuppliers = async (query) => {
  const supplierQuery = new QueryBuilder(Supplier.find(), query)
    .search(SUPPLIER_SEARCHABLE_FIELDS)
    .filter(SUPPLIER_FILTERABLE_FIELDS)
    .sort()
    .paginate()
    .fields();

  const suppliers = await supplierQuery.modelQuery;
  const meta = await supplierQuery.countTotal();

  return {
    meta,
    data: suppliers.map(sanitizeSupplier),
  };
};

// Internal utility method for cross-module procurement validations
export const validateSupplierForProcurement = async (publicId) => {
  const supplier = await Supplier.findOne({ publicId, isDeleted: false });
  
  if (!supplier) {
    throw new Error('Supplier record not found in system.');
  }
  
  if (supplier.status === SUPPLIER_STATUS.BLACKLISTED) {
    throw new Error('Operational Halt: Purchase processing rejected for BLACKLISTED vendors.');
  }
  
  return supplier;
};

export const SupplierService = {
  createSupplier,
  getSuppliers,
};
