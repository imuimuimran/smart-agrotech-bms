import app from "./app.js";
import env from "./config/env.js";

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`
==========================================
🚀 Smart AgroTech BMS Server Started
🌐 Environment : ${env.nodeEnv}
📡 Port        : ${PORT}
==========================================
`);
});