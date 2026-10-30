import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRepo } from "./repo-url.ts";

test("formats acceptés", () => {
  const expected = { owner: "vercel", name: "next.js" };
  for (const input of [
    "vercel/next.js",
    "https://github.com/vercel/next.js",
    "github.com/vercel/next.js/",
    "http://www.github.com/vercel/next.js.git",
    "https://github.com/vercel/next.js/tree/canary/docs",
    "https://github.com/vercel/next.js?tab=readme-ov-file#readme",
    "  vercel/next.js  ",
  ]) {
    assert.deepEqual(parseRepo(input), expected, input);
  }
});

test("formats refusés", () => {
  for (const input of [
    "",
    "vercel",
    "https://gitlab.com/vercel/next.js",
    "../etc/passwd",
    "vercel/..",
    "ver_cel/next.js",
    "-vercel/next.js",
    "vercel/next js",
    "vercel/next.js%2F..",
  ]) {
    assert.equal(parseRepo(input), null, input);
  }
});
