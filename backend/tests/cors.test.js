import assert from "node:assert";
import test from "node:test";
import { corsOptions } from "../config/cors.js";

const checkOrigin = (origin) =>
  new Promise((resolve) => {
    corsOptions.origin(origin, (err, allow) => {
      resolve({ err, allow });
    });
  });

test("CORS: credentials is set to true and origin is a dynamic validator function, not wildcard string '*'", () => {
  assert.strictEqual(corsOptions.credentials, true);
  assert.strictEqual(typeof corsOptions.origin, "function");
  assert.notStrictEqual(corsOptions.origin, "*");
});

test("CORS: allows requests without origin header (mobile apps, curl, server-to-server)", async () => {
  const result = await checkOrigin(undefined);
  assert.strictEqual(result.err, null);
  assert.strictEqual(result.allow, true);
});

test("CORS: allows localhost development origins", async () => {
  const localhost5173 = await checkOrigin("http://localhost:5173");
  assert.strictEqual(localhost5173.err, null);
  assert.strictEqual(localhost5173.allow, true);

  const localhost3000 = await checkOrigin("http://localhost:3000");
  assert.strictEqual(localhost3000.err, null);
  assert.strictEqual(localhost3000.allow, true);

  const ipOrigin = await checkOrigin("http://127.0.0.1:5173");
  assert.strictEqual(ipOrigin.err, null);
  assert.strictEqual(ipOrigin.allow, true);
});

test("CORS: allows Vercel production and preview deployment domains", async () => {
  const prod = await checkOrigin("https://grievance-portal-major.vercel.app");
  assert.strictEqual(prod.err, null);
  assert.strictEqual(prod.allow, true);

  const preview = await checkOrigin("https://grievance-portal-git-feat-test.vercel.app");
  assert.strictEqual(preview.err, null);
  assert.strictEqual(preview.allow, true);
});

test("CORS: blocks unauthorized external origins in production", async () => {
  const oldEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const result = await checkOrigin("https://malicious-site.com");
    assert(result.err instanceof Error);
    assert(result.err.message.includes("CORS blocked"));
  } finally {
    process.env.NODE_ENV = oldEnv;
  }
});
