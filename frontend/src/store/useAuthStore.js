import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development"
    ? "http://localhost:5001"
    : "https://quickquack.onrender.com";

export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            set({ authUser: res.data });
            get().connectSocket();
        } catch (error) {
            console.error("Error in checkAuth:", error);
            if (error.response?.status === 401) {
                set({ authUser: null });
            } else if (error.response?.status === 404) {
                toast.error("Authentication service unavailable");
            } else {
                toast.error("Failed to verify authentication status");
            }
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data });
            toast.success("Account created successfully");
            get().connectSocket();
        } catch (error) {
            const message = error.response?.data?.message || "Failed to create account";
            toast.error(message);
            throw error;
        } finally {
            set({ isSigningUp: false });
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success("Logged in successfully");
            get().connectSocket();
        } catch (error) {
            const message = error.response?.data?.message || "Failed to log in";
            toast.error(message);
            throw error;
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            get().disconnectSocket();
            set({ authUser: null });
            toast.success("Logged out successfully");
        } catch (error) {
            console.error("Error in logout:", error);
            toast.error("Failed to log out");
        }
    },

    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({ authUser: res.data });
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Error in update profile:", error);
            const message = error.response?.data?.message || "Failed to update profile";
            toast.error(message);
            throw error;
        } finally {
            set({ isUpdatingProfile: false });
        }
    },

    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            query: { userId: authUser._id },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            withCredentials: true
        });

        socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
            toast.error("Failed to connect to chat server");
        });

        socket.on("connect", () => {
            console.log("Socket connected successfully");
        });

        socket.connect();
        set({ socket: socket });

        socket.on("getOnlineUsers", (userIds) => {
            set({ onlineUsers: userIds });
        });
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket?.connected) {
            socket.off("getOnlineUsers");
            socket.off("connect_error");
            socket.off("connect");
            socket.disconnect();
            set({ socket: null, onlineUsers: [] });
        }
    },
}));