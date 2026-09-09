import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getRuntimeSettings } from "../utils/runtimeSettings.js";

const rateBuckets = new Map();

const getTokenFromRequest = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

export async function runtimeRateLimit(req, res, next) {
  try {
    const settings = await getRuntimeSettings();
    const limit = Number(settings?.api?.rateLimitPerMin ?? 120);
    if (!Number.isFinite(limit) || limit <= 0) return next();

    const now = Date.now();
    const windowMs = 60 * 1000;
    const ip = getClientIp(req);
    const key = `${ip}:${Math.floor(now / windowMs)}`;

    const bucket = rateBuckets.get(key) || { count: 0, createdAt: now };
    bucket.count += 1;
    rateBuckets.set(key, bucket);

    if (rateBuckets.size > 5000) {
      const staleThreshold = now - 2 * windowMs;
      for (const [bucketKey, value] of rateBuckets.entries()) {
        if (value.createdAt < staleThreshold) rateBuckets.delete(bucketKey);
      }
    }

    if (bucket.count > limit) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again in a minute.",
      });
    }

    return next();
  } catch {
    return next();
  }
}

export async function maintenanceModeGuard(req, res, next) {
  try {
    if (req.path.startsWith("/auth")) return next();

    const settings = await getRuntimeSettings();
    const maintenanceMode = Boolean(settings?.system?.maintenanceMode);
    if (!maintenanceMode) return next();

    const token = getTokenFromRequest(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("role isActive").lean();
        if (user?.isActive && user.role === "admin") {
          return next();
        }
      } catch {
        // non-admin/invalid token -> maintenance response
      }
    }

    return res.status(503).json({
      success: false,
      message: "Service is temporarily unavailable due to scheduled maintenance.",
    });
  } catch {
    return next();
  }
}

const authRateBuckets = new Map();

/**
 * Stricter rate limiter for sensitive authentication endpoints
 * Limits to 10 attempts per 15 minutes per IP
 */
export function authRateLimit(req, res, next) {
  try {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const limit = 15; // 15 attempts per 15-minute window
    const ip = getClientIp(req);
    const key = `${ip}:${Math.floor(now / windowMs)}`;

    const bucket = authRateBuckets.get(key) || { count: 0, createdAt: now };
    bucket.count += 1;
    authRateBuckets.set(key, bucket);

    if (authRateBuckets.size > 2000) {
      const staleThreshold = now - 2 * windowMs;
      for (const [bucketKey, value] of authRateBuckets.entries()) {
        if (value.createdAt < staleThreshold) authRateBuckets.delete(bucketKey);
      }
    }

    if (bucket.count > limit) {
      return res.status(429).json({
        success: false,
        message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
      });
    }

    return next();
  } catch {
    return next();
  }
}

