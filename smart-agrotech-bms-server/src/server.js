import app from "./app.js";
import env from "./config/env.js";
import connectDB from "./config/db.js";

const startServer = async () => {
  try {
    await connectDB();

    if (env.nodeEnv === "development") {
      const { runActivityLogVerificationSuite } = await import("./modules/activity-logs/activityLog.test.js");
      await runActivityLogVerificationSuite();
    }

    app.listen(env.port, () => {
      console.log(`
==========================================
🚀 Smart AgroTech BMS Server Started
🌍 Environment : ${env.nodeEnv}
📡 Port        : ${env.port}
==========================================
`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();


process.on("SIGINT", async () => {
  console.log("\n🛑 Gracefully shutting down...");

  await import("mongoose").then(({ default: mongoose }) =>
    mongoose.connection.close()
  );

  console.log("✅ MongoDB Connection Closed");

  process.exit(0);
});