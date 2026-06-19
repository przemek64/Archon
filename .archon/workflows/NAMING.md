# Custom Workflow Naming Standard

Applies to **our** custom Archon workflows (to keep them distinct from upstream defaults).

## Prefix

`archon2-` — marks a workflow we authored/tuned. Upstream defaults keep their original `archon-*` names.

## Fix-issue family

```
archon2-fix-github-issue-<plan>-<gen.eval>-<review>
```

Three model slots, separated by `-`. The adversarial pair is joined by `.` (generator `.` evaluator):

| Slot | Meaning |
|---|---|
| `<plan>` | provider for investigate / plan |
| `<gen.eval>` | adversarial implement loop: generator `.` evaluator |
| `<review>` | provider for the review agents + synthesize |

Example:
```
archon2-fix-github-issue-codex-kimi.codex-kimi
```
= plan **codex**, builder **kimi** / evaluator **codex**, review **kimi**.

## Review-only family

```
archon2-pr-review-<review>
```
Example: `archon2-pr-review-kimi`.

## Optional qualifier suffix

A trailing `-<qualifier>` may be appended to mark a behavioral variant that the model slots
don't capture (e.g. `-deep` = exhaustive per-file + multi-round passes). Example:
```
archon2-pr-review-m27.m3-deep
```

## Model tokens

Short canonical tokens, so names sort cleanly:

| Token | Model |
|---|---|
| `codex` | codex / gpt-5.4 |
| `kimi`  | pi / kimi-coding/kimi-for-coding |
| `m27`   | pi / MiniMax-M2.7 |
| `m3`    | pi / MiniMax-M3 |
| `sonnet`| claude / sonnet |

The trivial-node default (MiniMax-M2.7 — classify, web-research, create-pr, validate,
report, etc.) stays **implicit**; only the 3 meaningful slots appear in the name.

## Notes

- The `name:` field inside the YAML must match the filename (minus `.yaml`); discovery
  and the GUI/CLI index on `name:`.
- When a workflow is running, do not rename it in place — copy to the new name and leave
  the original until the run finishes.
