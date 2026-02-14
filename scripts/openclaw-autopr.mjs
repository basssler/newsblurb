#!/usr/bin/env node
/**
 * OpenClaw AutoPR helper for the newsblurb repo.
 *
 * Purpose: provide a small, deterministic interface around `gh` for automation.
 * This script does NOT generate code changes; the agent will do that.
 *
 * Commands:
 *   node scripts/openclaw-autopr.mjs list --label autopr --limit 10
 *   node scripts/openclaw-autopr.mjs pick --label autopr
 *
 * Output is JSON to stdout.
 */

import { execFileSync } from "node:child_process";

function usage(code = 0) {
  console.error(
    [
      "Usage:",
      "  node scripts/openclaw-autopr.mjs list --label <label> [--limit N]",
      "  node scripts/openclaw-autopr.mjs pick --label <label>",
    ].join("\n")
  );
  process.exit(code);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function gh(args) {
  const out = execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return out.trim();
}

function toInt(x, fallback) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function listIssues({ label, limit }) {
  if (!label) throw new Error("Missing --label");
  const lim = toInt(limit, 10);

  // Prefer issues with the label, open state, and newest updated.
  const json = gh([
    "issue",
    "list",
    "--state",
    "open",
    "--label",
    label,
    "--limit",
    String(lim),
    "--json",
    "number,title,body,labels,assignees,author,updatedAt,url",
  ]);

  const items = json ? JSON.parse(json) : [];
  // Sort newest updated first (gh already does, but keep deterministic).
  items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  return items;
}

function pickIssue({ label }) {
  const items = listIssues({ label, limit: 50 });
  // Heuristics:
  // - Prefer unassigned issues (nobody currently owns it)
  // - Otherwise take most recently updated
  const unassigned = items.filter((i) => (i.assignees?.length ?? 0) === 0);
  return (unassigned[0] ?? items[0]) ?? null;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) usage(1);

  const cmd = argv[0];
  const args = parseArgs(argv.slice(1));

  if (cmd === "list") {
    const label = args.label;
    const limit = args.limit;
    const items = listIssues({ label, limit });
    process.stdout.write(JSON.stringify({ ok: true, label, count: items.length, items }, null, 2) + "\n");
    return;
  }

  if (cmd === "pick") {
    const label = args.label;
    const item = pickIssue({ label });
    process.stdout.write(JSON.stringify({ ok: true, label, item }, null, 2) + "\n");
    return;
  }

  usage(1);
}

main();
