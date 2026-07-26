import { Supplier } from './supplier.model.js';
import { generateSupplierPublicId } from './supplier.utils.js';
import { SUPPLIER_STATUS } from './supplier.constants.js';

export const createSupplierIntoDB = async (supplierData, userId) => {
  const publicId = await generateSupplierPublicId();
  
  const finalData = {
    ...supplierData,
    publicId,
    supplierCode: publicId, // Standardizing matching references initially
    createdBy: userId,
  };

  return await Supplier.create(finalData);
};

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
