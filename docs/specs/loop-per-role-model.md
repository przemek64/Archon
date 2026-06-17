# Spec: per-role model selection inside loop nodes (adversarial "different mind")

Status: DRAFT / not yet implemented
Author handoff: written 2026-06-17 for a future session to implement.
Make a backup copy of the whole Archon dir before starting (the user is doing this).

## 1. Problem

The adversarial workflows (`archon-fix-github-issue-adversarial*`, `*-mixed*`,
`*-aggressive`, `*-progressive`) run a generator↔evaluator state machine inside a
single `loop:` node. The role each iteration plays (`building` = generator,
`evaluating` = evaluator) is decided at RUNTIME by reading `phase` from
`$ARTIFACTS_DIR/impl-state.json` inside the prompt.

But the loop node has ONE `provider`/`model` for ALL iterations. So generator and
evaluator run on the **same model**. `fresh_context: true` gives a fresh *session*
each iteration, but not a different *mind*. Observed consequence (cGantt issue #26,
PRs #27 and #28): the generator shipped a dependency-ordering bug and the evaluator —
same model, fresh context — had the same blind spot and graded it 9/10. A false pass.

Goal: let the loop run the **evaluator on a different provider/model than the
generator**, so the adversary is genuinely independent. Combined with the existing
`fresh_context: true`, this yields "fresh context AND different mind".

## 2. Current behavior — exact references

File: `packages/workflows/src/dag-executor.ts`

- `resolveNodeProviderAndModel(node, workflowProvider, workflowModel, ...)` — line ~385.
  Resolves a node's provider + model + `SendQueryOptions`. Used for normal nodes.
  Model resolution logic (model→provider via `resolveModelSpec`, capability warnings)
  is lines ~407–465.
- `executeLoopNode(...)` — line ~1955.
  - Line ~1978: resolves a SINGLE `aiClient = deps.getAgentProvider(workflowProvider)`
    ONCE, before the loop.
  - Line ~2009: `for (let i = startIteration; i <= loop.max_iterations; i++)` — every
    iteration uses that same `aiClient` and the same `resolvedOptions` (model).
  - Line ~2059: `fresh_context` already forces a clean session per iteration.
  - Line ~2352: `until_bash` shows the existing pattern for resolving `$ARTIFACTS_DIR`
    paths and running shell inside the loop — reuse this path-resolution approach.

Schema/types:
- `packages/workflows/src/schemas/dag-node.ts` — `LoopNode` schema + `isLoopNode`.
  The `loop` object holds `prompt`, `until`, `until_bash`, `max_iterations`,
  `fresh_context`, `interactive`, etc. This is where the new field is declared.

## 3. Proposed config (workflow YAML)

Add an OPTIONAL `loop.roleModels` block. Backward compatible: if absent, behavior is
exactly as today (single node-level provider/model).

```yaml
  - id: adversarial-implement
    provider: pi                      # fallback / default, unchanged
    model: minimax/MiniMax-M2.7
    loop:
      prompt: ...
      until: IMPL_DONE
      fresh_context: true
      max_iterations: 24
      roleModels:
        stateFile: $ARTIFACTS_DIR/impl-state.json   # JSON file the loop already maintains
        field: phase                                 # which JSON field selects the role
        map:
          building:   { provider: codex, model: gpt-5.5 }                 # generator = strong builder
          evaluating: { provider: pi,    model: kimi-coding/kimi-for-coding }  # evaluator = different mind
        default:      { provider: pi,    model: minimax/MiniMax-M2.7 }    # used if file/field/key missing
```

Notes:
- `stateFile`, `field`, `map`, `default` all required when `roleModels` present.
- Keys of `map` are matched case-sensitively against the string value at `field`.
- `default` is used on iteration 1 if the state file does not exist yet, or if the
  field value has no matching key.

## 4. Implementation steps

1. **Schema** (`schemas/dag-node.ts`): add optional `roleModels` to the loop schema:
   `{ stateFile: string, field: string, map: Record<string, {provider: string, model: string}>, default: {provider, model} }`.
   Update `LoopNode` TS type. Add validation: if present, `map` non-empty and `default` set.

2. **Refactor model resolution for reuse**: `resolveNodeProviderAndModel` currently
   takes a whole `node`. Extract the provider+model→`SendQueryOptions` core (lines
   ~407–465) into a helper callable with an explicit `(provider, model)` pair, e.g.
   `resolveProviderAndModelPair(provider, model, config, platform, conversationId, ...)`.
   Both the existing node path and the new per-iteration loop path call it.

3. **executeLoopNode per-iteration selection** (line ~2009 loop body, BEFORE sending
   the query):
   - If `loop.roleModels` is undefined → keep current behavior (single `aiClient` +
     `resolvedOptions`). No change.
   - Else, at the top of each iteration:
     a. Resolve `stateFile` path (expand `$ARTIFACTS_DIR` using `artifactsDir`, same as
        `until_bash` handling near line 2352).
     b. Read + JSON.parse the file. Read `roleModels.field` (e.g. `phase`).
        On any error / missing → use `roleModels.default`.
     c. Look up `map[value]` → `{provider, model}`; fall back to `default`.
     d. `aiClient = deps.getAgentProvider(provider)` for THIS iteration.
     e. Build this iteration's `SendQueryOptions` via the helper from step 2 (model
        override). Preserve all other resolved options.
   - Log the chosen provider/model per iteration:
     `getLog().info({ nodeId, iteration: i, role: value, provider, model }, 'loop_node.role_model_selected')`.

4. **Provider availability**: `deps.getAgentProvider(provider)` throws if a provider is
   not configured. When `roleModels` is used, validate at loop start that every distinct
   provider in `map` + `default` resolves, and fail fast with a descriptive error
   (mirror the existing fail-fast at lines ~1979–1986) so a run doesn't die mid-loop.

5. **Cost/turns aggregation** (`loopTotalCostUsd`, `loopTotalNumTurns`): unchanged —
   keep accumulating across iterations regardless of which model ran.

6. **Resume path** (`isLoopResume`, `startIteration`, line ~1993): the per-iteration
   resolution runs the same way on resume — it reads the state file each iteration, so
   resuming mid-loop picks the correct role's model automatically.

## 5. Tests

`packages/workflows/src/dag-executor.test.ts` already has loop-node tests (e.g. lines
~3843, ~3953 with `fresh_context`). Add:
- roleModels absent → single model used every iteration (regression).
- roleModels present, state file alternates `building`/`evaluating` → assert
  `getAgentProvider` / model used per iteration matches the map (mock provider, assert
  which provider id was invoked each iteration).
- state file missing on iteration 1 → uses `default`.
- field value not in map → uses `default`.
- unknown provider in map → fail-fast before first iteration.

## 6. Rollout

- Implement behind the optional field (zero impact on existing workflows).
- Then update `archon-fix-github-issue-adversarial-mixed.yaml` (and the
  `-aggressive` / `-progressive` copies) to add `roleModels` with a codex generator
  and a kimi/minimax evaluator (different mind).
- Mirror final YAML + engine change into BOTH source repos: Windows
  `C:\dev\repos\Archon` and WSL `/home/user/archon-src` (never the compiled binary).
- Validate with `archon workflow list` (0 parse errors) then a real run on a small
  issue; confirm `loop_node.role_model_selected` logs show alternating providers.

## 7. Acceptance

A single adversarial loop run shows, in its logs, the GENERATOR iterations on one
provider/model and the EVALUATOR iterations on a different provider/model, with
`fresh_context` still true — i.e. fresh context AND different mind, in one loop node.
