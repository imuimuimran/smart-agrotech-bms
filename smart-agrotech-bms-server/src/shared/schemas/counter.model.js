import mongoose from "mongoose";

const { Schema, model } = mongoose;

const counterSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { versionKey: false }
);

const Counter = model("Counter", counterSchema);
export default Counter;
