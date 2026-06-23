export const meta = {
  name: 'ship-change',
  description:
    'Ship a focused code change end-to-end: create an isolated worktree, implement, simplify, review+fix blocking issues, verify locally, then open a PR (PR only if verification passes). Uses Codex for the review pass if it is available, and degrades to a normal review agent if not. If the target repo ships its own /pr skill, the verify+PR step is delegated to it.',
  whenToUse:
    'A scoped change on an existing repo that should end in a PR. Pass args.task (what to build), args.repo (abs path). Optional: baseBranch, branch, verifyHints, openPr, runReview.',
  phases: [
    { title: 'Setup' },
    { title: 'Implement' },
    { title: 'Simplify' },
    { title: 'Review' },
    { title: 'Verify' },
    { title: 'PR' },
  ],
}

// ───────────────────────── args / defaults ─────────────────────────
const a = args || {}
const TASK = a.task
const REPO = a.repo
if (!TASK || !REPO) {
  throw new Error(
    'ship-change requires args.task (what to build) and args.repo (absolute repo path).'
  )
}
const BASE = a.baseBranch || 'main'
const BRANCH_HINT = a.branch || '' // empty → Setup agent derives one
const VERIFY_HINTS = a.verifyHints || ''
const OPEN_PR = a.openPr !== false // default true
// review pass defaults on; accepts runReview, and runCodex for backward-compat
const RUN_REVIEW = a.runReview !== false && a.runCodex !== false

// ───────────────────────── Phase 0: Setup (worktree) ─────────────────────────
phase('Setup')
const SETUP_SCHEMA = {
  type: 'object',
  required: ['worktreePath', 'branch', 'baseRef'],
  properties: {
    worktreePath: { type: 'string' },
    branch: { type: 'string' },
    baseRef: { type: 'string' },
    hasPrSkill: { type: 'boolean' },
    envFilesCopied: { type: 'array', items: { type: 'string' } },
    depsWarmed: { type: 'string', enum: ['clone', 'install', 'skipped', 'none'] },
    notes: { type: 'string' },
  },
}
const setup = await agent(
  `Create an isolated git worktree to do an upcoming change in, WITHOUT disturbing the user's main checkout of the repo.

Repo: ${REPO}
Base branch: ${BASE}
Desired feature branch: ${BRANCH_HINT || '(none given — derive a short, kebab-case, conventional branch name from the task below)'}
Task the worktree is for (for branch-name derivation only — do NOT implement anything yet):
"""
${TASK}
"""

Steps:
1. cd ${REPO}. Run \`git fetch origin --prune\` (ignore failure if offline). Determine the freshest base ref: prefer \`origin/${BASE}\` if it exists, else local \`${BASE}\`.
2. Pick the feature branch name (use the given one if provided, else derive e.g. feat/<slug> or fix/<slug>). Make sure it does not already exist (append -2 etc. if needed).
3. Choose a worktree path OUTSIDE the main checkout: a sibling dir like \`<repo>-worktrees/<branch-slug>\` (create the parent dir if needed). Avoid nesting inside the repo.
4. Create it: \`git -C ${REPO} worktree add <worktreePath> -b <branch> <baseRef>\`.
5. Verify: the worktree path exists, \`git -C <worktreePath> rev-parse --abbrev-ref HEAD\` shows the new branch, and \`git -C <worktreePath> status\` is clean.
6. **Carry over gitignored local env files.** \`git worktree add\` only populates version-controlled files, so a fresh worktree has NO \`.env\` files and the app can't boot — this silently blocks later verification. Copy the base checkout's ignored env files into the worktree, preserving relative paths:
   - List ignored files: \`git -C ${REPO} ls-files --others --ignored --exclude-standard\`.
   - Keep ONLY env files — basename matching \`.env\` or \`.env.*\` (e.g. \`.env\`, \`.env.local\`, \`.env.development\`). Filter with \`grep -E '(^|/)\\.env(\\.[^/]+)?$'\`. Do NOT copy node_modules/dist/build/cache artifacts.
   - For each match \`<rel>\`: \`mkdir -p "<worktreePath>/$(dirname <rel>)"\` then \`cp "${REPO}/<rel>" "<worktreePath>/<rel>"\`. They stay gitignored in the worktree — confirm none show up in \`git -C <worktreePath> status\`.
   - Record the copied relative paths in \`envFilesCopied\` (empty array if the repo has none — that's fine).
7. **Warm the worktree's dependencies** so later stages (Implement/Simplify/Review/Verify) can run typecheck/lint/tests. A fresh worktree has NO \`node_modules\`. Set \`depsWarmed\` to which path you took. (This step is JS/Node-flavored; adapt to the repo's ecosystem — for non-Node repos, set depsWarmed='none' and let later stages set up the environment on demand.)
   - If \`${REPO}/node_modules\` does NOT exist, set depsWarmed='none' and skip (nothing to warm; later stages install on demand).
   - **FAST PATH (clone) — prefer this.** Valid ONLY when BOTH: (a) the base checkout is APFS (macOS) — just attempt the clone and fall back on error; AND (b) the worktree's lockfile matches the base's: \`diff -q "${REPO}/pnpm-lock.yaml" "<worktreePath>/pnpm-lock.yaml"\` identical (use whichever lockfile exists: pnpm-lock.yaml / package-lock.json / yarn.lock; if none, skip clone). When valid: enumerate top-level node_modules dirs via \`cd ${REPO} && find . -type d -name node_modules -prune | grep -v '/node_modules/'\` (root + each workspace package; NOT nested .pnpm ones). For EACH \`<rel>\`: \`mkdir -p "<worktreePath>/$(dirname <rel>)"\` then \`cp -c -R "${REPO}/<rel>" "<worktreePath>/<rel>"\` (\`-c\` = APFS clonefile, copy-on-write, near-instant, no extra disk; pnpm uses RELATIVE symlinks so the clone resolves at the new path). If \`cp -c\` errors (not APFS/cross-volume), abandon clone → fallback. On success set depsWarmed='clone'.
   - **FALLBACK (install).** If clone isn't valid/failed but base had node_modules: \`cd <worktreePath> && pnpm install --prefer-offline\` (or npm ci / yarn matching the lockfile — global store is warm so it's link-mostly). Set depsWarmed='install'. If install would be too heavy to be worth it, instead set depsWarmed='skipped' and note later stages should install on demand.
   - These node_modules stay gitignored — confirm \`git -C <worktreePath> status\` is still clean afterward.
8. Check whether the repo ships its own PR skill: test for the file \`<worktreePath>/.claude/skills/pr/SKILL.md\`. Set hasPrSkill=true if it exists, else false.

Do NOT implement the task. Do NOT modify the user's original checkout (only READ from it for the env copy + node_modules clone). Return the worktree path, branch, the base ref you branched from, hasPrSkill, envFilesCopied, and depsWarmed.`,
  { phase: 'Setup', schema: SETUP_SCHEMA }
)

if (!setup || !setup.worktreePath) {
  log('Setup failed to create a worktree — aborting.')
  return { setup, aborted: true }
}
const WT = setup.worktreePath
const BRANCH = setup.branch
log(`Worktree ready: ${WT} (branch ${BRANCH} off ${setup.baseRef})`)
const envCopied = setup.envFilesCopied || []
log(
  envCopied.length
    ? `Carried ${envCopied.length} gitignored env file(s) into the worktree: ${envCopied.join(', ')}`
    : 'No gitignored env files to carry over (or repo has none).'
)
const depsWarmed = setup.depsWarmed || 'none'
log(
  {
    clone: 'Dependencies warmed via APFS clone (node_modules copy-on-write from base checkout) — typecheck/tests runnable.',
    install: 'Dependencies warmed via package-manager install in the worktree — typecheck/tests runnable.',
    skipped: 'Dependency warm-up skipped — later stages install on demand before typecheck/tests.',
    none: 'No dependencies to warm (base checkout has no node_modules / non-Node repo).',
  }[depsWarmed] || `Dependency warm-up: ${depsWarmed}.`
)

// All later phases operate inside the worktree (WT), never the original ${REPO} checkout.

// ───────────────────────── Phase 1: Implement ─────────────────────────
phase('Implement')
const IMPL_SCHEMA = {
  type: 'object',
  required: ['filesChanged', 'summary', 'decisions'],
  properties: {
    filesChanged: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    decisions: { type: 'array', items: { type: 'string' } },
    openConcerns: { type: 'array', items: { type: 'string' } },
  },
}
const impl = await agent(
  `Implement the following task. Work ONLY inside the worktree at ${WT} (branch ${BRANCH}). Do NOT touch any other checkout. Do NOT git commit — a later stage commits once.

TASK:
"""
${TASK}
"""

Approach:
- Investigate first: read the relevant code, types, and call sites in ${WT} before editing. Confirm signatures/field names against the actual source — don't assume.
- Make the change focused and idiomatic — match the surrounding code's conventions, naming, and comment density.
- Prefer putting new pure/testable logic in its own module (free of framework/runtime-specific imports) and wiring it in, so it can be unit-tested in isolation.
- Add or update tests for the new behavior where the repo has a test setup.
- Respect any scope / out-of-scope boundaries stated in the task. Do not gold-plate. Leave a brief code comment for any deliberately deferred follow-up.
- Sanity-check types/build on the changed area if it's fast (don't block on a slow full build).
- Dependencies were pre-warmed in Setup (depsWarmed=${depsWarmed}), so they should already be present — typecheck/tests are runnable without installing. If you ADD or CHANGE a dependency, run the repo's install yourself; the global package store is warm so it's fast. If depsWarmed is 'skipped'/'none' and you need to typecheck/test, set up the environment first.

Return: files changed, a concise summary, key decisions, and any open concerns for downstream review.`,
  { phase: 'Implement', schema: IMPL_SCHEMA }
)
log(`Implement: ${impl?.filesChanged?.length ?? 0} file(s) changed`)

// ───────────────────────── Phase 2: Simplify ─────────────────────────
phase('Simplify')
const SIMP_SCHEMA = {
  type: 'object',
  required: ['changesMade', 'summary'],
  properties: {
    changesMade: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}
const simp = await agent(
  `Quality pass — SIMPLIFY ONLY (do not hunt for bugs, do not change behavior, do not expand scope) — over the uncommitted changes in the worktree ${WT} (branch ${BRANCH}).

What was just implemented:
${JSON.stringify(impl, null, 2)}

Run \`cd ${WT} && git --no-pager diff\` to see the exact changes, then improve ONLY the changed code for: reuse/dedup, simplification & readability, efficiency, and correct altitude (logic in the right module; entrypoints stay thin). Keep behavior identical. Do not commit. Apply edits directly and return what you changed.`,
  { phase: 'Simplify', schema: SIMP_SCHEMA }
)
log(`Simplify: ${simp?.changesMade?.length ?? 0} cleanup(s)`)

// ───────────────────────── Phase 3: Review + Fix ─────────────────────────
// Uses Codex for an independent second opinion when available; otherwise the agent
// does a rigorous blocking-issue review itself. Either way it fixes what it confirms.
let review = null
if (RUN_REVIEW) {
  phase('Review')
  const REVIEW_SCHEMA = {
    type: 'object',
    required: ['usedCodex', 'blockingIssues', 'verdict'],
    properties: {
      usedCodex: { type: 'boolean' },
      blockingIssues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            issue: { type: 'string' },
            severity: { type: 'string' },
            file: { type: 'string' },
            fixed: { type: 'boolean' },
          },
        },
      },
      fixesApplied: { type: 'array', items: { type: 'string' } },
      verdict: { type: 'string' },
    },
  }
  review = await agent(
    `Review the uncommitted diff in the worktree ${WT} (branch ${BRANCH}) for BLOCKING issues only, then fix them.

Steps:
1. \`cd ${WT} && git --no-pager diff\` to capture the change set.
2. Review the diff for BLOCKING problems — things that would break production or fail review: correctness bugs, runtime/environment incompatibilities, security holes (injection/escaping/authz), regressions to existing behavior, pathological regex/perf, and type errors. Ignore pure style nits (Simplify already ran).
   - If a Codex CLI/MCP is available and authenticated, run it on the diff for an independent second opinion and fold its findings in. Set usedCodex=true.
   - If Codex is unavailable/unauthenticated, do the review yourself — just as rigorously. Set usedCodex=false.
3. FIX every blocking issue you can confirm is real (edit files directly in ${WT}). Do NOT commit. Do NOT expand scope.

Return the structured result (usedCodex, the blocking issues with whether each was fixed, the fixes applied, and a one-line verdict).`,
    { phase: 'Review', schema: REVIEW_SCHEMA }
  )
  log(
    `Review: usedCodex=${review?.usedCodex}, ${review?.blockingIssues?.length ?? 0} blocking issue(s)`
  )
} else {
  log('Review skipped (runReview=false).')
}

// Delegate the verify+ship flow to the target repo's own /pr skill when it has one.
// That skill runs its own (heavier, app-driving) verification + regression sweep and
// only opens a PR once the feature is proven — so we skip this workflow's Verify phase.
const USE_PR_SKILL = OPEN_PR && !!setup.hasPrSkill
if (USE_PR_SKILL) {
  log('Found a /pr skill in the worktree — delegating verification + PR to it (skipping this workflow\'s own Verify phase).')
}

// ───────────────────────── Phase 4: Verify ─────────────────────────
let verify = null
if (!USE_PR_SKILL) {
  phase('Verify')
  const VERIFY_SCHEMA = {
    type: 'object',
    required: ['passed', 'commands', 'summary'],
    properties: {
      passed: { type: 'boolean' },
      commands: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cmd: { type: 'string' },
            ok: { type: 'boolean' },
            note: { type: 'string' },
          },
        },
      },
      couldNotVerify: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
    },
  }
  verify = await agent(
    `Locally verify the uncommitted changes in the worktree ${WT} (branch ${BRANCH}). Be rigorous and HONEST — report real command output; never claim success you didn't observe.

${VERIFY_HINTS ? `Verification hints from the requester: ${VERIFY_HINTS}\n` : ''}Steps:
1. Discover the right commands from the repo (package.json/turbo.json/Makefile/etc.). Prefer SCOPED, fast checks over full builds: type-check, lint on changed files, and the unit/integration tests that cover the changed code.
2. Run them; capture pass/fail + key output for each.
3. If something fails due to a real defect in the new code, apply a MINIMAL fix and re-run (a few iterations max). Do not expand scope. Do not commit.
4. Honestly list under couldNotVerify anything that can't be checked locally (e.g. real production runtime, external services, manual UX).

Set passed=true ONLY if the relevant checks for the changed code pass. Return the actual commands you ran.`,
    { phase: 'Verify', schema: VERIFY_SCHEMA }
  )
  log(`Verify: passed=${verify?.passed}`)
}

// ───────────────────────── Phase 5: PR ─────────────────────────
// Delegated path (USE_PR_SKILL): commit, then hand off to the repo's /pr skill, which
// verifies the feature and runs the regression sweep before it opens the PR.
// Inline path: open the PR only after this workflow's own Verify passed.
const PR_SCHEMA = {
  type: 'object',
  required: ['prUrl', 'branch', 'summary'],
  properties: {
    prUrl: { type: 'string' },
    branch: { type: 'string' },
    commit: { type: 'string' },
    summary: { type: 'string' },
  },
}
let pr = null
if (!OPEN_PR) {
  log(`openPr=false — stopping after verify. Changes are in the worktree ${WT} (branch ${BRANCH}), uncommitted.`)
} else if (USE_PR_SKILL) {
  phase('PR')
  pr = await agent(
    `Commit the change, then run THIS repo's own /pr skill to verify-and-ship. Work in the worktree ${WT} (branch ${BRANCH}, base ${BASE}).

The /pr skill requires the change to be committed on a branch first, and it independently verifies the feature (a verifier sub-agent drives the running app) and runs the regression sweep BEFORE opening a PR. Do NOT open a PR yourself ahead of that — let the skill gate it.

Steps:
1. cd ${WT}; review \`git status\` and \`git --no-pager diff\` so the commit includes only the intended files (no stray/unrelated files).
2. git add the intended files; commit with a clear Conventional Commit message that summarizes the change and notes any deliberate follow-ups/out-of-scope items.
3. Read \`${WT}/.claude/skills/pr/SKILL.md\` and follow its procedure EXACTLY (bring up the stack, delegate feature verification, regression sweep, then open the PR with proof). Run everything from inside ${WT}.${VERIFY_HINTS ? `\n   Verification hints from the requester to feed the verifier: ${VERIFY_HINTS}` : ''}
4. Return the PR URL, branch, and short commit sha.

If the skill's verification does not pass within its retry cap, or git push / gh fails (auth/permissions), do NOT force anything — return prUrl='' with the verdict/failure reason in summary so the human can finish it.`,
    { phase: 'PR', schema: PR_SCHEMA }
  )
  log(pr?.prUrl ? `PR opened: ${pr.prUrl}` : `PR not opened: ${pr?.summary ?? 'unknown'}`)
} else if (verify && verify.passed) {
  phase('PR')
  pr = await agent(
    `Commit the verified changes and open a PR. Work in the worktree ${WT} (branch ${BRANCH}, base ${BASE}).

Steps:
1. cd ${WT}; review \`git status\` and \`git --no-pager diff\` so the commit includes only the intended files (no stray/unrelated files).
2. git add the intended files; commit with a clear Conventional Commit message that summarizes the change and notes any deliberate follow-ups/out-of-scope items.
3. git push -u origin ${BRANCH}.
4. Open the PR: \`gh pr create --base ${BASE} --head ${BRANCH}\` with a clear title and a body covering: what & why, the verification performed, and explicit out-of-scope/follow-ups.
5. Return the PR URL, branch, and short commit sha.

If git push or gh fails (auth/permissions), do NOT force anything — return prUrl='' with the failure reason in summary so the human can finish it.`,
    { phase: 'PR', schema: PR_SCHEMA }
  )
  log(pr?.prUrl ? `PR opened: ${pr.prUrl}` : `PR not opened: ${pr?.summary ?? 'unknown'}`)
} else {
  log(
    `Verification did NOT pass — skipping commit/PR. Changes remain in the worktree ${WT} (branch ${BRANCH}) for human review.`
  )
}

return { setup, impl, simp, review, verify, pr, worktree: WT, branch: BRANCH }
