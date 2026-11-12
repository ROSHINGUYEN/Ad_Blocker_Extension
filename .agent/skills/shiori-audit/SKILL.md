---
name: shiori-audit
description: Read-only, evidence-backed audit of the actual Shiori repository before any implementation. Use at the start of a task or when paths, rules, architecture, dependencies, or test commands are unknown.
---

# Shiori Read-Only Audit

## Hard boundary
This skill is read-only. Do not edit, create, delete, format, install, migrate, commit, or run the application. Do not invoke scripts that mutate state. Inventory and inspect only.

## Steps
1. Confirm the actual workspace root and repository identity. Do not infer it from prior conversations.
2. Record `git status --short --branch` and whether the worktree has user changes. Never reset or stash changes automatically.
3. Discover and read applicable instructions:
   - root and nested `AGENTS.md` / `GEMINI.md`
   - `.agents/AGENTS.md`, `.agents/GEMINI.md`
   - immediate `.md` files in `.agents/rules/`
   - legacy `.agent/rules/` files
   - any `.agents/rules.json` and relevant linked rule files
4. Read README, architecture docs, deployment instructions, roadmap, test docs, and CI definitions that exist.
5. Inventory actual project manifests, lockfiles, environment templates, test directories, scripts, source modules, and entry points.
6. Identify path/import issues only when evidence supports them. Do not label an unused file as broken without tracing references.
7. Identify dependency drift using the actual package manager and lockfile. Do not install or upgrade packages.
8. Map major runtime flows and module boundaries. For Shiori, check which subsystems actually exist: Discord, RAG/memory, STT, TTS, Live2D/VTube Studio, streaming bridges, and related services. Do not assume all are present.
9. Capture existing test commands from project docs/CI/manifests. Do not invent commands.
10. If safe and permitted, inspect historical CI/test results; do not execute project code during this read-only audit.
11. Produce `AUDIT_REPORT.md` and a prioritized roadmap as proposed artifacts only; do not write them into the repository until authorized.

## Output
For every finding include ID, severity P0-P3, status, evidence path/line or command output, impact, confidence, recommended action, proposed owner, and verification method.

Use statuses CONFIRMED, SUSPECTED, UNCONFIRMED, NOT_TESTED, MISSING, and BLOCKED.

End with:
- confirmed facts vs assumptions
- files/rules read and files that could not be read
- existing user changes that must be preserved
- proposed files to add/edit, with rationale
- exact next steps and approval gates
- no claim that the audit is exhaustive if any area was not inspected
