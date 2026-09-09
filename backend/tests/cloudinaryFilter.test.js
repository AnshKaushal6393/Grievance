import assert from "node:assert";
import test from "node:test";
import { fileFilter } from "../config/cloudinary.js";

const runFilter = (file) =>
  new Promise((resolve) => {
    fileFilter({}, file, (err, accepted) => {
      resolve({ err, accepted });
    });
  });

test("fileFilter accepts .mov files with video/quicktime MIME", async () => {
  const result = await runFilter({ originalname: "evidence.mov", mimetype: "video/quicktime" });
  assert.strictEqual(result.err, null);
  assert.strictEqual(result.accepted, true);
});

test("fileFilter accepts .avi files with video/x-msvideo MIME", async () => {
  const result = await runFilter({ originalname: "recording.avi", mimetype: "video/x-msvideo" });
  assert.strictEqual(result.err, null);
  assert.strictEqual(result.accepted, true);
});

test("fileFilter accepts standard images and videos (.mp4, .png, .jpg)", async () => {
  const mp4Res = await runFilter({ originalname: "clip.mp4", mimetype: "video/mp4" });
  assert.strictEqual(mp4Res.accepted, true);

  const pngRes = await runFilter({ originalname: "screenshot.png", mimetype: "image/png" });
  assert.strictEqual(pngRes.accepted, true);

  const jpgRes = await runFilter({ originalname: "photo.jpg", mimetype: "image/jpeg" });
  assert.strictEqual(jpgRes.accepted, true);
});

test("fileFilter rejects spoofed .exe with video/mp4 MIME", async () => {
  const result = await runFilter({ originalname: "malware.exe", mimetype: "video/mp4" });
  assert(result.err instanceof Error);
  assert.strictEqual(result.err.message, "Invalid file type. Only images and videos are allowed.");
  assert.strictEqual(result.accepted, undefined);
});

test("fileFilter rejects disallowed extensions and MIMEs", async () => {
  const result = await runFilter({ originalname: "report.pdf", mimetype: "application/pdf" });
  assert(result.err instanceof Error);
  assert.strictEqual(result.err.message, "Invalid file type. Only images and videos are allowed.");
});
