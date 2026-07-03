# Split fix-issue pipeline (p1 / p2 / p3) — usage

The monolithic `archonx-fix-github-issue` workflow is split into **3 independently
runnable parts**, linked by a deterministic shared branch. Each part is a separate
`archon workflow run`; they hand off **locally** (nothing is pushed between parts),
so **all three must run in the SAME git checkout**.

| Part | Workflow (kimi chain) | Does |
|---|---|---|
| **p1** | `archonx-fix-github-issue-p1-1c-2km3` | classify + research + investigate/plan (codex) + adversarial negotiate (kimi→M3). **Freezes** the plan + acceptance contract onto a side ref and creates the work branch. STOPS. |
| **p2** | `archonx-fix-github-issue-p2-3kc` | bootstraps the frozen contract, runs the cross-model implement loop (kimi build / codex evaluate), validates, runs the project gate, opens a **draft PR**. |
| **p3** | `archonx-fix-github-issue-p3-4m3m3k` | M3.M3 adversarial review of the PR (M3 review pass + a 2nd M3 audit for misses/false-positives), kimi self-fix + simplify, reports to the issue. |

Naming convention: `p<part>-<model-chain>`. The chain suffix encodes the models
(`-1c-2km3` = codex plan / kimi+M3 negotiate, `-3kc` = kimi build / codex eval,
`-4m3m3k` = M3.M3 review / kimi fix). The work branch suffix (`-kimi`) is fixed by
the chain.

---

## Argument grammar

Every part takes the **same** arguments, parsed identically:

```
<issue#> [suffix] [from:<ref>]
```

### `<issue#>` (required)
The GitHub issue number. Free-text is tolerated ("fix issue 65 please") — the number
is extracted. Variant tokens (`v2`, `sfx:…`, `from:…`) are ignored when finding it.

### `suffix` (optional, STANDARD)
A variant tag, **carried across all three parts**, appended to both the work branch
and the side ref:

```
archon/fix-issue-<N>-kimi-<suffix>
refs/archon-run/issue-<N>-kimi-<suffix>
```

Use it to run a fresh attempt **without clearing the old branch / PR**. Two forms:
- bare `v<N>` — e.g. `v2`, `v3`
- `sfx:<token>` — e.g. `sfx:exp`, `sfx:retry`

Empty suffix == the original deterministic names (`archon/fix-issue-<N>-kimi`).

> Pass the **same** suffix to p1, p2, and p3 — that is what links them.

### `from:<ref>` (optional, ESCAPE HATCH — non-standard)
An explicit commit SHA or branch name.
- In **p1**: the work branch is created **starting from** `<ref>` instead of the clean
  base tip.
- In **p2 / p3**: the part **operates on that explicit branch** instead of the derived
  work branch. (The contract is still read from the suffixed side ref, so keep the
  suffix consistent with the p1 that froze the handoff.)

---

## Examples

### 1. Standard run (default branch)
```
archon workflow run archonx-fix-github-issue-p1-1c-2km3  65
archon workflow run archonx-fix-github-issue-p2-3kc      65
archon workflow run archonx-fix-github-issue-p3-4m3m3k   65
```
→ branch `archon/fix-issue-65-kimi`, side ref `refs/archon-run/issue-65-kimi`, one PR.

### 2. Second attempt alongside the first (suffix) — no clearing needed
```
archon workflow run archonx-fix-github-issue-p1-1c-2km3  65 v2
archon workflow run archonx-fix-github-issue-p2-3kc      65 v2
archon workflow run archonx-fix-github-issue-p3-4m3m3k   65 v2
```
→ branch `archon/fix-issue-65-kimi-v2`, ref `refs/archon-run/issue-65-kimi-v2`, a new PR.
The original `archon/fix-issue-65-kimi` and its PR are untouched.

### 3. Start the work branch from a specific commit (escape hatch)
```
archon workflow run archonx-fix-github-issue-p1-1c-2km3  65 v2 from:9341719
```
→ `archon/fix-issue-65-kimi-v2` begins at commit `9341719` instead of the clean base.

### 4. Point a later part at an explicit branch
```
archon workflow run archonx-fix-github-issue-p3-4m3m3k  65 from:archon/fix-issue-65-kimi
```
→ p3 reviews whatever PR has head `archon/fix-issue-65-kimi`.

---

## Rules & gotchas

- **Same checkout for all parts.** The handoff (plan/contract) lives in a *local*
  side ref that is never pushed; p2/p3 read it from the same working copy p1 wrote.
- **Same suffix end-to-end.** A mismatched suffix means p2/p3 won't find p1's frozen
  handoff (or will operate on the wrong branch).
- **Suffix vs. clearing.** With a suffix you never need to delete the old branch or
  close the old PR — that was the whole point. Plain re-use of the no-suffix name
  would require clearing first (p2 pushes with a non-`--force` `git push`, which is
  rejected if the branch already diverged on origin).
- **p1 creates the work branch but does NOT check it out** (so p2 can claim it). It
  also writes the contract to the side ref *out of* the branch, so `.archon-run/`
  never leaks into the PR diff.
- **Detached launch for long runs** (per the vault ENVIRONMENT.md "Canonical detached
  launch") — the harness reaps background tasks at ~60 min.

---

## Cross-chain switching (kimi → glm/opus)

Only the **kimi** chain (`p1-1c-2km3` / `p2-3kc` / `p3-4m3m3k`) is currently ported to
the `p` convention. To switch implementer (e.g. kimi credits exhausted → continue with
glm), the `-3gc` / `-4m3m3g` (glm) and `-3ko` / `-4m3m3o` (opus) variants need cloning to
the same `p2`/`p3` naming + argument grammar. Not yet built — ask if needed.
