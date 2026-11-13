---
name: shiori-engineering-loop
description: Execute one approved Shiori engineering task through coding, testing, debugging, independent review, and a controlled smoke test. Use only after the audit and task plan have been approved.
---

# Shiori Engineering Loop

## Entry gate
Do not start until there is an approved task with: goal, owner, file scope, dependencies, acceptance criteria, test commands, risk rating, and rollback. Confirm current Git status and preserve all pre-existing modifications.

## Procedure
1. Select one bounded task. Check dependencies and file ownership.
2. Create/use an isolated branch or worktree if available. Never share-write the same files with another agent.
3. Capture the relevant baseline: current test results, behavior, latency, resource usage, or known failure.
4. Implement the smallest change that addresses the confirmed cause. Do not bundle unrelated refactors.
5. Inspect the diff for accidental changes, secrets, generated files, and scope creep.
6. Run static checks and the narrowest relevant test using commands discovered from the repository.
7. On failure, capture exit code and complete relevant logs. Reproduce and classify the root cause before changing code.
8. Add/update a regression test when feasible. Never alter tests only to force success.
9. Run integration and regression tests affected by the change.
10. Ask a separate reviewer/tester role to inspect the diff and evidence. If no separate agent is available, perform a clearly labeled second-pass review; do not misrepresent it as independent.
11. Run a controlled smoke test only when its environment and side effects are understood.
12. Compare results with acceptance criteria and baseline.
13. If the same root cause fails three fix attempts, stop and replan.
14. Do not merge, release, deploy, or perform destructive migrations without the required approval.

## Statuses
- DONE: all acceptance criteria and required checks have evidence.
- INCOMPLETE: work exists but one or more criteria are unmet.
- BLOCKED: access, environment, instruction, or safety gate prevents progress.
- FAILED: the task was attempted and failed.
- NOT_TESTED: no test evidence was collected.

## Final report
Summarize changed files, why each changed, tests with exact commands and results, baseline comparison, review findings, known limitations, rollback, and next task. Never say PASS for a command that was not run.
