import mongoose from "mongoose";
import env from "./env.js";

const connectDB = async () => {
  try {
    // const connection = await mongoose.connect(env.databaseUrl);
    const connection = await mongoose.connect(env.databaseUrl, {
      autoIndex: true,
    });

    console.log(`
==========================================
🍃 MongoDB Connected Successfully
🗄️ Database : ${connection.connection.name}
🌐 Host     : ${connection.connection.host}
==========================================
`);
  } catch (error) {
    console.error(`
==========================================
❌ MongoDB Connection Failed
==========================================
`);

    console.error(error.message);

    process.exit(1);
  }
};

export default connectDB;