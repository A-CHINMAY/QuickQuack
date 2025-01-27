import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://quick-quack-lovat.vercel.app"
        ],
        credentials: true,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Store for online users: userId -> socketId mapping
const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
    return userSocketMap.get(userId);
}

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Get userId from socket handshake
    const userId = socket.handshake.query.userId;

    if (userId) {
        userSocketMap.set(userId, socket.id);
        console.log("User connected:", userId);

        // Broadcast online users to all connected clients
        io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);

        if (userId) {
            userSocketMap.delete(userId);
            console.log("User disconnected:", userId);

            // Broadcast updated online users list
            io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
        }
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
    });

    // Handle errors
    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });
});

// Error handling for the io server
io.engine.on("connection_error", (error) => {
    console.error("Connection error:", error);
});

// Middleware to handle authentication
io.use((socket, next) => {
    const userId = socket.handshake.query.userId;

    if (!userId) {
        return next(new Error("User ID not provided"));
    }

    // Attach userId to socket for later use
    socket.userId = userId;
    next();
});

export { io, app, server };