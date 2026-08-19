---
description: Review the current git diff against the project rules without modifying files.
disable-model-invocation: true
---

Read `AGENTS.md`, `CLAUDE.md`, and the relevant files under `.claude/rules/` first.
Then inspect the current diff and report only actionable findings, ordered as blocker,
warning, and note. Check security, accessibility, server/client boundaries, data contracts,
and whether user-facing buttons have real behavior. Do not modify files or commit changes.
