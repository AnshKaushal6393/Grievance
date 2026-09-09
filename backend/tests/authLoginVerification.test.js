import assert from "node:assert";
import test from "node:test";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-12345";

import { login } from "../controllers/authController.js";
import User from "../models/User.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test("Regression: Login with valid credentials but isEmailVerified: false returns 403 and EMAIL_NOT_VERIFIED", async () => {
  const originalFindByEmailOrPhone = User.findByEmailOrPhone;

  try {
    const mockUser = {
      _id: "60d0fe4f5311236168a109ca",
      name: "Test User",
      email: "unverified@example.com",
      phone: "9876543210",
      role: "citizen",
      password: "hashedPassword123",
      isActive: true,
      isEmailVerified: false,
      comparePassword: async (candidate) => candidate === "ValidPass123!",
      save: async () => {},
    };

    User.findByEmailOrPhone = () => ({
      select: () => mockUser,
    });

    const req = {
      body: {
        email: "unverified@example.com",
        password: "ValidPass123!",
      },
    };
    const res = createMockRes();

    await login(req, res);

    // Assertions
    assert.strictEqual(res.statusCode, 403, "Must return HTTP 403");
    assert.strictEqual(res.body?.success, false, "Success must be false");
    assert.strictEqual(res.body?.code, "EMAIL_NOT_VERIFIED", "Code must be EMAIL_NOT_VERIFIED");
    assert.strictEqual(
      res.body?.message,
      "Please verify your email address before logging in.",
      "Must return distinct unverified email message"
    );
    assert.strictEqual(res.body?.data?.token, undefined, "Must NOT issue a token");
    assert.strictEqual(res.body?.data?.userId, "60d0fe4f5311236168a109ca", "Must return userId for OTP redirection");
  } finally {
    User.findByEmailOrPhone = originalFindByEmailOrPhone;
  }
});

test("Security: Login with invalid password does not reveal verification status (prevents enumeration)", async () => {
  const originalFindByEmailOrPhone = User.findByEmailOrPhone;

  try {
    const mockUser = {
      _id: "60d0fe4f5311236168a109ca",
      email: "unverified@example.com",
      password: "hashedPassword123",
      isActive: true,
      isEmailVerified: false,
      comparePassword: async () => false, // Wrong password
      save: async () => {},
    };

    User.findByEmailOrPhone = () => ({
      select: () => mockUser,
    });

    const req = {
      body: {
        email: "unverified@example.com",
        password: "WrongPassword!",
      },
    };
    const res = createMockRes();

    await login(req, res);

    assert.strictEqual(res.statusCode, 401, "Must return HTTP 401 for wrong credentials");
    assert.strictEqual(res.body?.message, "Invalid credentials");
    assert.strictEqual(res.body?.code, undefined, "Must not reveal EMAIL_NOT_VERIFIED on wrong password");
  } finally {
    User.findByEmailOrPhone = originalFindByEmailOrPhone;
  }
});

test("Security: Inactive account check runs before unverified email check", async () => {
  const originalFindByEmailOrPhone = User.findByEmailOrPhone;

  try {
    const mockUser = {
      _id: "60d0fe4f5311236168a109ca",
      email: "deactivated@example.com",
      password: "hashedPassword123",
      isActive: false, // Inactive
      isEmailVerified: false, // Also unverified
      comparePassword: async () => true, // Password is correct
      save: async () => {},
    };

    User.findByEmailOrPhone = () => ({
      select: () => mockUser,
    });

    const req = {
      body: {
        email: "deactivated@example.com",
        password: "ValidPass123!",
      },
    };
    const res = createMockRes();

    await login(req, res);

    assert.strictEqual(res.statusCode, 403, "Must return HTTP 403 for inactive account");
    assert.strictEqual(res.body?.message, "Your account has been deactivated. Please contact support.");
    assert.notStrictEqual(res.body?.code, "EMAIL_NOT_VERIFIED", "Must reject inactive account before checking verification");
  } finally {
    User.findByEmailOrPhone = originalFindByEmailOrPhone;
  }
});

test("Success: Login with verified email and valid password succeeds with token", async () => {
  const originalFindByEmailOrPhone = User.findByEmailOrPhone;

  try {
    const mockUser = {
      _id: "60d0fe4f5311236168a109ca",
      name: "Verified User",
      email: "verified@example.com",
      phone: "9876543210",
      role: "citizen",
      password: "hashedPassword123",
      isActive: true,
      isEmailVerified: true,
      comparePassword: async () => true,
      save: async () => {},
    };

    User.findByEmailOrPhone = () => ({
      select: () => mockUser,
    });

    const req = {
      body: {
        email: "verified@example.com",
        password: "ValidPass123!",
      },
    };
    const res = createMockRes();

    await login(req, res);

    assert.strictEqual(res.statusCode, 200, "Must return HTTP 200");
    assert.strictEqual(res.body?.success, true);
    assert(typeof res.body?.data?.token === "string", "Must issue a valid token");
    assert.strictEqual(res.body?.data?.user?.email, "verified@example.com");
  } finally {
    User.findByEmailOrPhone = originalFindByEmailOrPhone;
  }
});

