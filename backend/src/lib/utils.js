import jwt from "jsonwebtoken";

// Adjusting the generateToken function for better cross-origin handling
export const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d", // Keeps the session valid for 7 days
    });

    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        httpOnly: true, // Prevents access to the cookie via JavaScript
        sameSite: "Lax", // Allows cross-origin requests but still offers protection
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production (requires HTTPS)
    });

    return token;
};
