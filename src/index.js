
import connectDB from "./database/db.js";
import app from "./app.js";
import config from "./config/config.js";

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start the server
    const server = app.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      console.log("Server error occurred:", error.message);
      process.exit(1);
    });

  } catch (error) {
    console.log("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();