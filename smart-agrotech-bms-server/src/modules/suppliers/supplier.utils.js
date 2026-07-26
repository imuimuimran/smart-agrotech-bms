import { Supplier } from './supplier.model.js';
import { SUPPLIER_PREFIX, SUPPLIER_STARTING_NUMBER } from './supplier.constants.js';

/**
 * Generates the next sequential Supplier Public ID (e.g., SUP-100001)
 * Temporary approach until replacing with an atomic Counter Collection.
 * @returns {Promise<string>} Next unique publicId string
 */
export const generateSupplierPublicId = async () => {
  const lastSupplier = await Supplier.findOne({}, { publicId: 1 })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastSupplier || !lastSupplier.publicId) {
    const nextNum = SUPPLIER_STARTING_NUMBER + 1;
    return `${SUPPLIER_PREFIX}-${nextNum}`;
  }

  const currentNumber = parseInt(lastSupplier.publicId.split('-')[1], 10);
  const nextNum = currentNumber + 1;
  return `${SUPPLIER_PREFIX}-${nextNum}`;
};
