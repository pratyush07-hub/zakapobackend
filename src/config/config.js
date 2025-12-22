import dotenv from "dotenv";

// Load environment variables from .env file if it exists
dotenv.config();

const config = {
  // MongoDB Configuration
  MONGODB_URI: process.env.MONGODB_URI,
  
  // Server Configuration
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || "default_jwt_secret_change_in_production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY ,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,
  
  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST ,
  EMAIL_PORT: process.env.EMAIL_PORT ,
  EMAIL_USER: process.env.EMAIL_USER ,
  EMAIL_PASS: process.env.EMAIL_PASS ,
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || ["http://localhost:3000", "http://localhost:4000", "http://localhost:5173","https://zakapofrontend.vercel.app","https://zakapobackend.vercel.app"],
  
  // Database Name
  DB_NAME: "Zakapo",

  // Shopify (optional) - can be supplied directly or via process.env
  SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL,
  SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,
  SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || "2024-04",
  SHOPIFY_LOCATION_ID: process.env.SHOPIFY_LOCATION_ID,

  // BigCommerce (optional) - can be supplied directly or via process.env
  BIGCOMMERCE_STORE_HASH: process.env.BIGCOMMERCE_STORE_HASH,
  BIGCOMMERCE_ACCESS_TOKEN: process.env.BIGCOMMERCE_ACCESS_TOKEN,
  BIGCOMMERCE_CLIENT_ID: process.env.BIGCOMMERCE_CLIENT_ID,
  BIGCOMMERCE_CLIENT_SECRET: process.env.BIGCOMMERCE_CLIENT_SECRET,
};

export default config;
