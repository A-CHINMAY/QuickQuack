import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";  // Assuming you have a User model to fetch user info from DB

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",  // Frontend URL for development
            "https://quick-quack-lovat.vercel.app"  // Frontend URL for production
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

        // Fetch user profile details from the database
        User.findById(userId).then(user => {
            // Send the full list of online users with their details
            const onlineUsersWithProfiles = Array.from(userSocketMap.keys()).map(id => ({
                userId: id,
                username: user.username,  // Assuming user has a 'username' field
                avatar: user.avatar,  // Assuming user has an 'avatar' field
            }));

            // Emit online users with their profile data
            io.emit("getOnlineUsers", onlineUsersWithProfiles);
        });
    }

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);

        if (userId) {
            userSocketMap.delete(userId);
            console.log("User disconnected:", userId);

            // Broadcast updated online users list
            io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
        }
    });

    // Other socket event handling...
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
