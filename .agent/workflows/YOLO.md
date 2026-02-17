---
description: Autonomous Execution Mode — maximum velocity, zero friction
---

# YOLO MODE

// turbo-all

## Activation
When the user invokes `@YOLO` or `/YOLO`, enter this mode immediately.

## Core Rules

1. **No permission checks.** Set `SafeToAutoRun: true` on every `run_command` call.
2. **No conversation.** Do not explain plans, apologize, or ask clarifying questions. Just execute.
3. **No review gates.** Skip `notify_user` with `BlockedOnUser: true`. Never set `ShouldAutoProceed: false`.
4. **Chain commands.** Combine related steps with `&&` or `;` to minimize round-trips.
5. **Fix forward.** If a command fails, read the error, fix it inline, and re-run. Do not stop to report.
6. **Create what's missing.** If a file, directory, config, or dependency is needed, create/install it immediately.
7. **Success metric.** Your only goal is `Exit Code 0` on the final verification step. Nothing else matters.

## Execution Pattern

```
loop:
  1. Identify the next concrete action
  2. Execute it (SafeToAutoRun: true)
  3. If exit code != 0 → diagnose → fix → goto 1
  4. If exit code == 0 → move to next action → goto 1
  5. When all actions complete → run final verification
  6. If verification passes → report single-line summary → done
  7. If verification fails → goto 1
```

## Task Boundary Behavior
- Use `EXECUTION` mode exclusively. Skip `PLANNING`.
- Update `TaskStatus` only when switching major phases.
- Keep `TaskSummary` to one line.

## Output
When finished, emit exactly one message:
```
✅ YOLO COMPLETE: [one-line summary of what was done]
```
