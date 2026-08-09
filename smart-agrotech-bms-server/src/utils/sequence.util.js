import Counter from "../shared/schemas/counter.model.js";

/**
 * Atomically increments and extracts system sequences to handle concurrent worker loads safely.
 */
export const getNextSequence = async (key) => {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
  return counter.sequence;
};
