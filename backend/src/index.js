import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// Define allowed origins based on environment
const allowedOrigins = [
    "http://localhost:5173",
    "https://quick-quack-lovat.vercel.app"
];

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Enhanced CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        console.error(`Origin ${origin} not allowed by CORS`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['set-cookie']
}));

// Pre-flight OPTIONS request handling
app.options('*', cors());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            message: 'Origin not allowed'
        });
    }
    res.status(500).json({
        message: 'Internal server error'
    });
});

// Production setup
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
    });
}

// Server startup
server.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT} in ${process.env.NODE_ENV} mode`);
    connectDB().then(() => {
        console.log("Database connected successfully");
    }).catch((err) => {
        console.error("Database connection error:", err);
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    // In production, you might want to restart the server
    if (process.env.NODE_ENV === 'production') {
        server.close(() => process.exit(1));
    }
});