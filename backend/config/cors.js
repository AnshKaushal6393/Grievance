const getAllowedOrigins = () => {
  const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((item) => item.trim())
    : [];

  const defaults = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "https://grievance-portal-major.vercel.app",
  ];

  const origins = new Set(defaults);
  for (const origin of envOrigins) {
    if (origin) {
      origins.add(origin);
      if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
        origins.add(`https://${origin}`);
        origins.add(`http://${origin}`);
      }
    }
  }
  return origins;
};

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();
    const normalizedOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    try {
      const { hostname } = new URL(origin);
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".vercel.app") ||
        hostname.endsWith(".onrender.com")
      ) {
        return callback(null, true);
      }
    } catch {
      // Invalid URL format
    }

    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 200,
};

export default corsOptions;
