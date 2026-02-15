# AutoPR Queue

This list acts as a backlog for the autonomous agent. Items here are NOT automatically executed.
A meta-agent (or you) should promote these to GitHub issues and label them `autopr` when ready for work.

## Priority 0 (Critical / Fixes)
- [ ] Add `lint` script to `package.json` (`"lint": "next lint"`) to standardize the lint command.
- [ ] Verify `npm test` runs successfully in CI environment (GitHub Actions or local).

## Priority 1 (Improvements)
- [ ] Add more unit tests for `src/lib/newsAggregator.ts` to mock Anthropic responses and verify parsing logic.
- [ ] Improve error handling in `src/lib/alphaVantage.ts` to better catch and report rate limit errors to the UI.

## Priority 2 (Nice to have)
- [ ] Refactor long components in `src/app/page.tsx` (if any) into smaller sub-components.
- [ ] Add a "Last Updated" timestamp to the insights UI to show cache freshness.
