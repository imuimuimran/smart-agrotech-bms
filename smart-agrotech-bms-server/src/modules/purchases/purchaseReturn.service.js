import { getNextSequence } from "../../utils/sequence.util.js";

/**
 * Phase 12.4.2 - Consecutive Return Number Generation Engine
 * 
 * Uses the project's shared atomic sequence helper to generate unique 
 * document numbers independent of Purchase Orders or Sales records.
 * Both returns and exchanges share this identical serial sequence.
 * 
 * @param {Object} session - Optional MongoDB transactional session boundary
 * @returns {Promise<string>} e.g., PRRET-000001
 */
const generatePurchaseReturnNumber = async (session) => {
  const sequence = await getNextSequence("purchase_return", session);
  return `PRRET-${String(sequence).padStart(6, "0")}`;
};

// Exporting service engine footprint
export const PurchaseReturnService = {
  // Methods will be added sequentially as we proceed
};
