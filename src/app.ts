import express, { Application, Request, Response } from "express";
import cors from "cors";
import path from "path"; // Import necessário
import uploadConfig from "./config/upload"; // Import da configuração
import { errorMiddleware } from "./middlewares/error.middleware";

// Routes
import authRoutes from "./routes/auth.routes";
import occurrenceRoutes from "./routes/occurrence.routes";
import userRoutes from "./routes/user.routes";
import reportRoutes from "./routes/report.routes";

const app: Application = express();

// ==================== MIDDLEWARES ====================
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== STATIC FILES ====================
// Permite acessar http://localhost:3001/files/nome-da-foto.jpg
app.use("/files", express.static(uploadConfig.directory));

// ==================== ROUTES ====================
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    message: "SISOCC API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/occurrences", occurrenceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);

// ==================== ERROR HANDLING ====================
app.use(errorMiddleware);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

export default app;
