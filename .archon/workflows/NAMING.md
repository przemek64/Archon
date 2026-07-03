# Custom Workflow Naming Standard

Applies to **our** custom Archon workflows (to keep them distinct from upstream defaults).

## Prefix

`archonx-` — marks a workflow we authored/tuned. Upstream defaults keep their original `archon-*` names.

## Fix-issue family (numbered-stage scheme)

```
archonx-fix-github-issue-<stages>[-prod]
```

Each stage is `<digit><models>`, stages joined by `-`. The digit names the stage so order
is self-documenting and a stage can be omitted when unused (e.g. no `2` = single-pass
negotiate, not adversarial). Models are single letters concatenated; `m3`/`m27` kept whole.

| Stage | Meaning |
|---|---|
| `1` | plan / investigate |
| `2` | negotiate. Single-pass (one mind) = `2<model>` (e.g. `2g`). Adversarial two-seat = `2<proposer><adversary>` (e.g. `2gm3` = glm propose -> m3 adversary). The token length tells them apart. |
| `3` | build + adversarial implement loop: generator + evaluator (e.g. `3gc` = gen glm / eval codex) |
| `4` | review + synthesize (doubled = adversarial pair, e.g. `4m3m3`) |

Model letters: `c`=codex `g`=glm `k`=kimi `o`=opus `s`=sonnet; `m3`/`m27` whole. Tokens
parse left-to-right against the known set, so `2gm3` = `g` then `m3`.

`-prod` suffix marks a workflow actually used in production (vs experiment/test variants).

### Split (multi-part) fix-issue chains

Archon has no sub-workflow node, so a fix-issue workflow can be split into independently
runnable PARTS that chain via a deterministic shared branch (`archon/fix-issue-<N>`). Each
part inserts a `part<K>-` token right after `archonx-fix-github-issue-`, BEFORE the stage
tokens, and carries only the stages it runs:

```
archonx-fix-github-issue-part<K>-<stages-this-part-runs>
```

| Part | Stages | Role |
|---|---|---|
| `part1` | `1c-2gm3` | plan/investigate + adversarial negotiate; freezes plan+contract onto the branch, STOPS |
| `part2` | `3gc`     | bootstrap frozen contract -> adversarial implement -> validate/gate -> open PR |
| `part3` | `4m3m3g`  | bootstrap the PR -> m3.m3 review -> self-fix + simplify (`g`=glm) -> report |

Run them in order, same git checkout: `part1 <issue#>`, then `part2 <issue#>`, then
`part3 <issue#>`. Handoff is local-only (the shared branch is not pushed until part2's PR).

Examples:
```
archonx-fix-github-issue-1c-2g-3gc-4g-prod   = plan codex, negotiate glm (single-pass), build glm/eval codex, review glm
archonx-fix-github-issue-1c-2k-3kc-4k-prod   = plan codex, negotiate kimi (single-pass), build kimi/eval codex, review kimi
archonx-fix-github-issue-1c-2gm3-3gc-4g      = adversarial negotiate glm->m3 (TEST, not prod)
```

## Review-only family

```
archonx-pr-review-<review>
```
Example: `archonx-pr-review-kimi`.

## Optional qualifier suffix

A trailing `-<qualifier>` may be appended to mark a behavioral variant that the model slots
don't capture (e.g. `-deep` = exhaustive per-file + multi-round passes). Example:
```
archonx-pr-review-m27.m3-deep
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
