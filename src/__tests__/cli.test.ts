import { describe, test, expect } from "bun:test";
import { join } from "path";

const CLI = join(import.meta.dir, "../../src/cli.ts");

function run(...args: string[]) {
  return Bun.spawnSync(["bun", "run", CLI, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("CLI top-level", () => {
  test("--help exits 0 and prints usage", () => {
    const { exitCode, stdout } = run("--help");
    expect(exitCode).toBe(0);
    const out = stdout.toString();
    expect(out).toInclude("Usage:");
    expect(out).toInclude("search");
  });

  test("--version exits 0 and prints a version string", () => {
    const { exitCode, stdout } = run("--version");
    expect(exitCode).toBe(0);
    expect(stdout.toString().trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("search command - argument validation", () => {
  test("--help exits 0 and documents all flags", () => {
    const { exitCode, stdout } = run("search", "--help");
    expect(exitCode).toBe(0);
    const out = stdout.toString();
    expect(out).toInclude("--type");
    expect(out).toInclude("--location");
    expect(out).toInclude("--limit");
    expect(out).toInclude("--source");
    expect(out).toInclude("--json");
  });

  test("missing --type exits non-zero", () => {
    const { exitCode } = run("search");
    expect(exitCode).not.toBe(0);
  });

  test("invalid --source exits 1 with error message", () => {
    const { exitCode, stderr } = run("search", "--type", "dentist", "--source", "invalid");
    expect(exitCode).toBe(1);
    expect(stderr.toString()).toInclude("--source must be one of");
  });

  test("non-numeric --limit exits 1 with error message", () => {
    const { exitCode, stderr } = run("search", "--type", "dentist", "--limit", "abc");
    expect(exitCode).toBe(1);
    expect(stderr.toString()).toInclude("--limit must be a positive integer");
  });

  test("zero --limit exits 1 with error message", () => {
    const { exitCode, stderr } = run("search", "--type", "dentist", "--limit", "0");
    expect(exitCode).toBe(1);
    expect(stderr.toString()).toInclude("--limit must be a positive integer");
  });

  test("negative --limit exits 1 with error message", () => {
    const { exitCode, stderr } = run("search", "--type", "dentist", "--limit", "-5");
    expect(exitCode).toBe(1);
    expect(stderr.toString()).toInclude("--limit must be a positive integer");
  });
});
