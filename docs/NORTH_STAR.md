# NewsBlurb — NORTH_STAR

Last updated: 2026-02-14
Owner: Max
Scope: This document governs how autonomous work is selected, executed, tested, and shipped.

---

## 0) Purpose
NewsBlurb exists to: **provide AI-powered market intelligence by synthesizing technical signals and fundamental data into actionable insights.**

This doc is the **single source of truth** for:
- Vision (what “done” looks like)
- Guardrails (what must never happen)
- Quality bar (what must always be true)
- Autonomy protocol (how work is allowed to start)

---

## 1) Vision (what “done” looks like)
**North Star Outcome:**  
Users can **instantly gauge market sentiment for a ticker** with **high reliability**, and trust that summaries are **grounded in real technical data (RSI, SMA, ATR) and clearly marked as AI-generated**.

**Success looks like:**
- Reliability: Insights are generated even when data is sparse (graceful fallback).
- Speed: Page loads are fast; API calls to Alpha Vantage are efficient and cached.
- Trust: AI insights clearly cite the technical indicators (RSI, SMA) used to form the opinion.
- Product clarity: The UI is clean, responsive (Tailwind), and distraction-free.
- Maintenance: Code is typed (TypeScript), tested (Jest), and follows Next.js best practices.

---

## 2) Non-goals (explicitly out of scope for autonomous changes)
Autonomous work must NOT:
- Change authentication/authorization systems (`next-auth`, GitHub OAuth) without explicit approval.
- Introduce DB migrations (using Vercel KV mostly) without explicit approval.
- Modify billing/payments (if any).
- Modify production deployment infrastructure (Vercel settings, secrets in `.env.local`).
- Add analytics/trackers beyond what’s already present.
- Major dependency upgrades (e.g., Next.js version bumps) without explicit plan.

If a task requires any of the above, the agent must STOP and open an issue comment explaining why.

---

## 3) Guardrails (hard constraints)
### 3.1 Security and secrets
- **CRITICAL**: Never commit secrets (API keys like `ALPHA_VANTAGE_API_KEY`, `GITHUB_SECRET`, `.env.local` contents).
- Never print secrets in logs.
- No new network calls to unknown third-party endpoints without approval.
- Protect the `anthropic-ai/sdk` usage; do not expose API keys to the client side.

### 3.2 Dependency policy
- No dependency additions/major upgrades unless:
  1) the benefit is clear,
  2) the risk is explained,
  3) you provide a rollback plan,
  4) it’s approved in the issue before coding.
- Patch/minor bumps are allowed only if they pass tests and don’t require config changes.

### 3.3 API Rate Limits
- **Alpha Vantage**: Strictly respect the 5 calls/minute limit. Use the existing caching mechanism in `src/lib/newsAggregator.ts` (@vercel/kv). do not implement aggressive retries that could burn the quota.

### 3.4 Scope discipline
- One issue → one PR.
- No drive-by refactors unless required to complete the issue.
- If the issue is larger than ~200 lines of meaningful change, break it into sub-issues first.

---

## 4) Definition of Done (DoD)
A PR is “done” only if all are true:
- [ ] The change matches the issue scope and acceptance criteria.
- [ ] Tests pass locally (`npm test`) and results are stated in the PR.
- [ ] Lint/format passes (`npx next lint`).
- [ ] No secrets added; no credential-shaped strings introduced.
- [ ] UX: error states are handled; no silent failures.
- [ ] Documentation updated if behavior changed (README or docs/*).

If tests do not exist for the touched area:
- Add at least one minimal test OR justify why it’s not feasible and propose the test to add later.

---

## 5) Priorities (what matters most)
### P0 — Must protect
- Security (API keys, OAuth)
- Build stability (`npm run build` must pass)
- API Rate Limit compliance (Alpha Vantage)

### P1 — Must improve
- Reliability and error handling (especially API failures)
- Caching logic (to save API calls)
- Core UX clarity (insights display)

### P2 — Nice-to-have
- Refactors that reduce complexity (e.g., extracting components)
- Minor UI polish (Tailwind tweaks)
- Developer experience improvements (better logs)

---

## 6) Work selection protocol (Autonomy Rules)
The agent may only create code changes when ALL are true:
1) There is a GitHub issue with clear acceptance criteria.
2) The issue is labeled **autopr** (or the configured label).
3) The issue does not violate Non-goals or Guardrails.

The agent may create/suggest issues from `AUTOPR_QUEUE.md`, but must never code directly from the queue without a labeled issue.

---

## 7) Issue format (required fields)
Every executable issue must include:
- **Problem:** what’s broken / missing.
- **Goal:** what “good” looks like.
- **Acceptance Criteria:** bullet list, testable.
- **Constraints:** any guardrails relevant to this change.
- **Out of scope:** what not to touch.

If acceptance criteria are missing, the agent should comment a proposed set and wait.

---

## 8) PR format (required structure)
PR title:
- `[#ISSUE] <short verb phrase>`

PR body must include:
- **What changed**
- **Why**
- **How tested** (e.g., `npm test`, `npm run build`, manual check)
- **Risk** (what might break)
- **Rollback** (how to revert quickly)
- **Screenshots** (if UI changes)

PRs should be opened as **Draft** by default.

---

## 9) Branching and commits
- Branch naming: `agent/<issue-number>-<kebab-slug>`
- Keep commits logical; avoid “wip” unless necessary.
- Squash merge preferred unless the repo uses a different convention.

---

## 10) Observability + error handling standards
- User-facing: show actionable messages (not raw stack traces).
- Developer-facing: logs should be structured and not leak secrets.
- When API calls fail: handle retries/backoff if appropriate and fail gracefully.

---

## 11) Testing commands
Canonical commands for this repo:
- Install: `npm install`
- Dev: `npm run dev` (runs `next dev --turbopack`)
- Lint: `npx next lint` (Next.js default)
- Test: `npm test` (runs `jest`)
- Build: `npm run build` (runs `next build`)

If any of these do not exist, the agent should detect and propose the correct set.

---

## 12) Change management
If a change impacts user behavior:
- Update docs (README / docs)
- Add/adjust tests
- Note any backward-compat concerns in PR

---

## 13) “Stop conditions” (when the agent must not proceed)
Stop and ask (via issue comment) if:
- Requirements are ambiguous
- The change touches non-goals (Auth, Billing, Secrets)
- A dependency change is needed
- Secrets/config are required but not provided
- The fix requires product decisions (UX, copy, policy)
