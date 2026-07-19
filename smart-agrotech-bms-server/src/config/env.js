import dotenv from "dotenv";

dotenv.config();

const requiredEnvVariables = [
  "DATABASE_URL",
  "JWT_SECRET",
  "CLIENT_URL",
];

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: Number(process.env.PORT) || 5000,

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET,

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  cookieName: process.env.COOKIE_NAME || "bms_access_token",

  cookieExpiresIn: Number(process.env.COOKIE_EXPIRES_IN) || 7,

  cookieSecure: process.env.COOKIE_SECURE === "true",

  clientUrl: process.env.CLIENT_URL,
};

export default env;