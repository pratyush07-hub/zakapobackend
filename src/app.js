import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/config.js";
import addItemRouter from "./routes/addItemRouter.js";
import userRoute from "./routes/user.routes.js";
import productRouter from "./routes/productRouter.js";
import stockRouter from "./routes/stockRouter.js";
import statsRouter from "./routes/statsRouter.js";
import salesRouter from "./routes/salesRouter.js";
import forgetPasswordRouter from "./routes/forgetPasswordRouter.js";
import organisationRouter from "./routes/organisationRouter.js";
import legalRouter from "./routes/legalRouter.js";
import bigcommerceRouter from "./routes/bigcommerceRouter.js";
import comboRouter from "./routes/comboRouter.js";

const app = express();

app.use(
  cors({
    origin: "https://zakapofrontend.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));

app.use(cookieParser());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    port: config.PORT
  });
});

// route declaration

app.use("/api/user", userRoute);

// Organisation and Legal Details routes
app.use("/api/organisation", organisationRouter);
app.use("/api/legal", legalRouter);

// rotes
app.use("/api/add-item", addItemRouter);
app.use("/api/get-item", addItemRouter);
app.use("/api/update-item", addItemRouter);
app.use("/api/delete-item", addItemRouter);
app.use("/api/all-products", productRouter);
app.use("/api/product-stocks", stockRouter);
app.use("/api/sales-report", salesRouter);
app.use("/api/sales-stats", statsRouter);
app.use("/api/auth", forgetPasswordRouter);

// BigCommerce routes
app.use("/api/bigcommerce", bigcommerceRouter);

// Combo routes
app.use("/api/combos", comboRouter);

export default app;
