import Supplier from './supplier.model.js';
import QueryBuilder from "../../builder/QueryBuilder.js";
import ApiError from "../../shared/ApiError.js";
import httpStatus from "../../constants/httpStatus.js";
import { 
  generateSupplierPublicId, 
  sanitizeSupplier 
} from './supplier.utils.js';
import { 
  SUPPLIER_STATUS, 
  SUPPLIER_SEARCHABLE_FIELDS, 
  SUPPLIER_FILTERABLE_FIELDS,
  SUPPLIER_MESSAGES,
 } from './supplier.constants.js';

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

const getSupplier = async (
  publicId
) => {

  const supplier =
    await Supplier.findOne({
      publicId,
    });

  if (!supplier) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      SUPPLIER_MESSAGES.SUPPLIER_NOT_FOUND
    );
  }

  return sanitizeSupplier(
    supplier
  );

};

const updateSupplier = async (
  publicId,
  payload,
  reqUser
) => {

  const supplier =
    await Supplier.findOne({
      publicId,
    });

  if (!supplier) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      SUPPLIER_MESSAGES.SUPPLIER_NOT_FOUND
    );
  }

  // Prevent duplicate email
  if (
    payload.email &&
    payload.email !== supplier.email
  ) {

    const emailExists =
      await Supplier.exists({

        email: payload.email,

        publicId: {
          $ne: publicId,
        },

      });

    if (emailExists) {

      throw new ApiError(
        httpStatus.CONFLICT,
        SUPPLIER_MESSAGES.EMAIL_ALREADY_EXISTS
      );

    }

  }

  // Prevent duplicate phone
  if (
    payload.phone &&
    payload.phone !== supplier.phone
  ) {

    const phoneExists =
      await Supplier.exists({

        phone: payload.phone,

        publicId: {
          $ne: publicId,
        },

      });

    if (phoneExists) {

      throw new ApiError(
        httpStatus.CONFLICT,
        SUPPLIER_MESSAGES.PHONE_ALREADY_EXISTS
      );

    }

  }

  payload.updatedBy =
    reqUser.publicId;

  const updatedSupplier =
    await Supplier.findOneAndUpdate(

      { publicId },

      payload,

      {

        new: true,

        runValidators: true,

      }

    );

  return sanitizeSupplier(
    updatedSupplier
  );

};

const deleteSupplier = async (
    publicId,
    reqUser
) => {

    const supplier =
        await Supplier.findOne({
            publicId,
        });

    if (!supplier) {

        throw new ApiError(
            httpStatus.NOT_FOUND,
            SUPPLIER_MESSAGES.SUPPLIER_NOT_FOUND
        );

    }

    /*
    Business Rule #1

    Outstanding payable
    */

    if (
        supplier.currentPayable > 0
    ) {

        throw new ApiError(
            httpStatus.BAD_REQUEST,
            SUPPLIER_MESSAGES.SUPPLIER_HAS_OUTSTANDING_PAYABLE
        );

    }

    /*
    Business Rule #2

    Purchase history

    Placeholder until Purchase Module
    */

    await Supplier.findOneAndUpdate(

        {
            publicId,
        },

        {

            isDeleted: true,

            deletedAt: new Date(),

            deletedBy:
                reqUser.publicId,

            updatedBy:
                reqUser.publicId,

        }

    );

    return null;

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
  getSupplier,
  updateSupplier,
  deleteSupplier,
};
