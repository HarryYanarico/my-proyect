// src/config/auth.js
export const JWT_SECRET = process.env.JWT_SECRET || "secret_key_para_desarrollo";
export const JWT_EXPIRES_IN = "1h";  // Ej: 1 hora de validez