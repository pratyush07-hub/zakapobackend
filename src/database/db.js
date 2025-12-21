import mongoose from "mongoose";
import config from "../config/config.js";

const buildMongoUri = (baseUri, dbName) => {
  const sanitizedBase = baseUri.replace(/\/+$/, "");
  // If base already contains a database path (e.g., mongodb://host:port/mydb), don't append DB_NAME
  const hasDbPath = /\/[^/?]+(\?|$)/.test(new URL(sanitizedBase).pathname);
  return hasDbPath ? sanitizedBase : `${sanitizedBase}/${dbName}`;
};

const connectDB = async () => {
  try {
    const connectionString = buildMongoUri(config.MONGODB_URI, config.DB_NAME);
    const dbResponseObject = await mongoose.connect(connectionString);
    console.log(`Database connected: ${dbResponseObject.connection.name}`);
    console.log("Database connection successful");
  } catch (error) {
    console.log("Error connecting to database:", error.message);
    process.exit(1);
  }
};

export default connectDB;
 