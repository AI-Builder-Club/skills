export const meta = {
  name: 'ship-change',
  description:
    '端到端交付一个聚焦的代码变更：创建隔离 worktree、实现、简化、review+修阻塞性问题、本地验证，然后开 PR（仅在验证通过时）。如果有 Codex 可用则用于 review pass，否则降级为普通 review agent。如果目标仓库自带 /pr skill，则验证+PR 步骤委派给它。',
  whenToUse:
    '一个在已有仓库上、应以 PR 收尾的范围明确变更。传入 args.task（要构建什么）、args.repo（绝对路径）。可选：baseBranch、branch、verifyHints、openPr、runReview。',
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
const BRANCH_HINT = a.branch || '' // 空 → Setup agent 派生一个
const VERIFY_HINTS = a.verifyHints || ''
const OPEN_PR = a.openPr !== false // 默认 true
// review pass 默认开启；接受 runReview，以及为向后兼容接受 runCodex
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
  `创建一个隔离的 git worktree，用于做接下来的变更，且不打扰用户对仓库的主检出。

仓库: ${REPO}
基线分支: ${BASE}
期望的功能分支: ${BRANCH_HINT || '（未提供 —— 从下方任务派生一个简短的 kebab-case 约定式分支名）'}
该 worktree 所服务的任务（仅用于派生分支名 —— 暂不要实现任何东西）:
"""
${TASK}
"""

步骤:
1. cd ${REPO}。运行 \`git fetch origin --prune\`（离线则忽略失败）。确定最新的基线 ref：若 \`origin/${BASE}\` 存在则优先用它，否则用本地 \`${BASE}\`。
2. 选定功能分支名（给了就用，否则派生如 feat/<slug> 或 fix/<slug>）。确认它不存在（需要时加 -2 等）。
3. 在主检出之外选一个 worktree 路径：同级目录如 \`<repo>-worktrees/<branch-slug>\`（需要时创建父目录）。避免嵌套在仓库内。
4. 创建它: \`git -C ${REPO} worktree add <worktreePath> -b <branch> <baseRef>\`。
5. 验证: worktree 路径存在、\`git -C <worktreePath> rev-parse --abbrev-ref HEAD\` 显示新分支、\`git -C <worktreePath> status\` 是干净的。
6. **携带 gitignored 的本地 env 文件。** \`git worktree add\` 只填充版本控制下的文件，所以全新 worktree 没有 \`.env\` 文件、应用起不来 —— 这会默默阻塞后续验证。把基检出的 ignored env 文件复制进 worktree，保留相对路径：
   - 列出 ignored 文件: \`git -C ${REPO} ls-files --others --ignored --exclude-standard\`。
   - 只保留 env 文件 —— basename 匹配 \`.env\` 或 \`.env.*\`（例如 \`.env\`、\`.env.local\`、\`.env.development\`）。用 \`grep -E '(^|/)\\.env(\\.[^/]+)?$'\` 过滤。不要复制 node_modules/dist/build/cache 产物。
   - 对每个匹配 \`<rel>\`: \`mkdir -p "<worktreePath>/$(dirname <rel>)"\` 然后 \`cp "${REPO}/<rel>" "<worktreePath>/<rel>"\`。它们在 worktree 里仍是 gitignored —— 确认没有出现在 \`git -C <worktreePath> status\` 里。
   - 把复制的相对路径记入 \`envFilesCopied\`（仓库没有则为空数组 —— 没关系）。
7. **预热 worktree 的依赖**，让后续阶段（Implement/Simplify/Review/Verify）能跑 typecheck/lint/tests。全新 worktree 没有 \`node_modules\`。把 \`depsWarmed\` 设为你走的路径。（此步偏 JS/Node；按仓库生态适配 —— 非 Node 仓库则设 depsWarmed='none'，让后续阶段按需准备环境。）
   - 若 \`${REPO}/node_modules\` 不存在，设 depsWarmed='none' 并跳过（没东西可预热；后续阶段按需安装）。
   - **快路径（clone）—— 优先。** 仅当同时满足才有效：(a) 基检出是 APFS（macOS）—— 直接尝试 clone，出错则回退；且 (b) worktree 的 lockfile 与基线一致: \`diff -q "${REPO}/pnpm-lock.yaml" "<worktreePath>/pnpm-lock.yaml"\` 相同（用存在的那个 lockfile：pnpm-lock.yaml / package-lock.json / yarn.lock；都没有则跳过 clone）。有效时：通过 \`cd ${REPO} && find . -type d -name node_modules -prune | grep -v '/node_modules/'\` 枚举顶层 node_modules 目录（根 + 每个 workspace package；不含嵌套的 .pnpm）。对每个 \`<rel>\`: \`mkdir -p "<worktreePath>/$(dirname <rel>)"\` 然后 \`cp -c -R "${REPO}/<rel>" "<worktreePath>/<rel>"\`（\`-c\` = APFS clonefile，写时复制，近乎瞬时、无额外磁盘；pnpm 用相对 symlink，所以 clone 在新路径下可解析）。若 \`cp -c\` 报错（非 APFS/跨卷），放弃 clone → 回退。成功则设 depsWarmed='clone'。
   - **回退（install）。** 若 clone 不可行/失败但基检出有 node_modules: \`cd <worktreePath> && pnpm install --prefer-offline\`（或匹配 lockfile 的 npm ci / yarn —— 全局 store 已暖，所以基本是 link）。设 depsWarmed='install'。若 install 太重不值得，则设 depsWarmed='skipped' 并注明后续阶段按需安装。
   - 这些 node_modules 保持 gitignored —— 确认之后 \`git -C <worktreePath> status\` 仍干净。
8. 检查仓库是否自带 PR skill: 测试文件 \`<worktreePath>/.claude/skills/pr/SKILL.md\` 是否存在。存在则 hasPrSkill=true，否则 false。

不要实现任务。不要修改用户的原始检出（仅从它读取以复制 env + clone node_modules）。返回 worktree 路径、分支、你分支出来的基线 ref、hasPrSkill、envFilesCopied、depsWarmed。`,
  { phase: 'Setup', schema: SETUP_SCHEMA }
)

if (!setup || !setup.worktreePath) {
  log('Setup 未能创建 worktree —— 中止。')
  return { setup, aborted: true }
}
const WT = setup.worktreePath
const BRANCH = setup.branch
log(`Worktree 就绪: ${WT}（分支 ${BRANCH}，基于 ${setup.baseRef}）`)
const envCopied = setup.envFilesCopied || []
log(
  envCopied.length
    ? `已携带 ${envCopied.length} 个 gitignored env 文件进 worktree: ${envCopied.join(', ')}`
    : '没有需要携带的 gitignored env 文件（或仓库没有）。'
)
const depsWarmed = setup.depsWarmed || 'none'
log(
  {
    clone: '依赖已通过 APFS clone 预热（node_modules 从基检出写时复制）—— typecheck/tests 可运行。',
    install: '依赖已通过在 worktree 内包管理器 install 预热 —— typecheck/tests 可运行。',
    skipped: '依赖预热已跳过 —— 后续阶段在 typecheck/tests 前按需安装。',
    none: '无可预热的依赖（基检出无 node_modules / 非 Node 仓库）。',
  }[depsWarmed] || `依赖预热: ${depsWarmed}.`
)

// 所有后续阶段都在 worktree（WT）内进行，绝不在原始 ${REPO} 检出内。

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
  `实现以下任务。只在 worktree ${WT}（分支 ${BRANCH}）内工作。不要碰任何其他检出。不要 git commit —— 后续阶段会统一提交一次。

TASK:
"""
${TASK}
"""

方法:
- 先调研：编辑前先读 ${WT} 里相关代码、类型和调用点。对照实际源码确认签名/字段名 —— 不要假设。
- 变更聚焦且地道 —— 匹配周围代码的约定、命名和注释密度。
- 优先把新的纯/可测逻辑放进它自己的模块（不含框架/运行时特定 import）再接线进去，以便单独单测。
- 在仓库有测试设置的地方为新行为添加或更新测试。
- 尊重任务里声明的任何范围 / 超出范围边界。不要镀金。对任何刻意延后的后续项留一段简短代码注释。
- 改动区域若 type-check/build 很快，做一次健全性检查（不要被慢的全量 build 阻塞）。
- 依赖已在 Setup 阶段预热（depsWarmed=${depsWarmed}），所以应已就位 —— 无需安装即可跑 typecheck/tests。如果你新增或改动了依赖，自己跑仓库的 install；全局包 store 已暖，所以很快。若 depsWarmed 为 'skipped'/'none' 且你需要 typecheck/test，先准备环境。

返回：改动的文件、简明摘要、关键决策、以及给下游 review 的任何开放疑虑。`,
  { phase: 'Implement', schema: IMPL_SCHEMA }
)
log(`Implement: 改动 ${impl?.filesChanged?.length ?? 0} 个文件`)

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
  `质量 pass —— 只做简化（不要找 bug、不要改行为、不要扩范围）—— 针对 worktree ${WT}（分支 ${BRANCH}）中未提交的改动。

刚实现的内容:
${JSON.stringify(impl, null, 2)}

运行 \`cd ${WT} && git --no-pager diff\` 查看精确改动，然后只针对改动代码改进：复用/去重、简化与可读性、效率、以及正确的层次（逻辑在合适的模块；入口保持精简）。保持行为一致。不要提交。直接应用编辑并返回你改了什么。`,
  { phase: 'Simplify', schema: SIMP_SCHEMA }
)
log(`Simplify: ${simp?.changesMade?.length ?? 0} 项清理`)

// ───────────────────────── Phase 3: Review + Fix ─────────────────────────
// 可用时用 Codex 取独立第二意见；否则 agent 自己做严格的阻塞问题
// review。无论哪种，它都修掉自己确认的问题。
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
    `Review worktree ${WT}（分支 ${BRANCH}）中未提交 diff 的阻塞性问题，然后修复它们。

步骤:
1. \`cd ${WT} && git --no-pager diff\` 捕获变更集。
2. Review diff 找阻塞性问题 —— 会搞坏生产或过不了 review 的东西：正确性 bug、运行时/环境不兼容、安全漏洞（注入/转义/authz）、对现有行为的回归、病态正则/性能、以及类型错误。忽略纯风格细枝末节（Simplify 已跑过）。
   - 如果有可用且已认证的 Codex CLI/MCP，在 diff 上跑它取独立第二意见并合并其发现。设 usedCodex=true。
   - 如果 Codex 不可用/未认证，你自己做 review —— 同样严格。设 usedCodex=false。
3. 修掉每一个你能确认为真的阻塞问题（直接在 ${WT} 里编辑文件）。不要提交。不要扩范围。

返回结构化结果（usedCodex、每个阻塞问题及其是否已修、应用的修复、以及一行结论）。`,
    { phase: 'Review', schema: REVIEW_SCHEMA }
  )
  log(
    `Review: usedCodex=${review?.usedCodex}，${review?.blockingIssues?.length ?? 0} 个阻塞问题`
  )
} else {
  log('Review 已跳过（runReview=false）。')
}

// 当目标仓库自带 /pr skill 时，把验证+交付流程委派给它。
// 该 skill 跑它自己更重的（驱动应用的）验证 + 回归扫描，并
// 仅在功能被证明后开 PR —— 因此跳过本 workflow 的 Verify 阶段。
const USE_PR_SKILL = OPEN_PR && !!setup.hasPrSkill
if (USE_PR_SKILL) {
  log('在 worktree 中发现 /pr skill —— 把验证 + PR 委派给它（跳过本 workflow 自己的 Verify 阶段）。')
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
    `本地验证 worktree ${WT}（分支 ${BRANCH}）中未提交的改动。要严格且诚实 —— 报告真实命令输出；绝不声称你没观察到的成功。

${VERIFY_HINTS ? `来自请求者的验证提示: ${VERIFY_HINTS}\n` : ''}步骤:
1. 从仓库发现正确命令（package.json/turbo.json/Makefile 等）。优先 SCOPED、快速的检查而非全量 build：type-check、改动文件的 lint、以及覆盖改动代码的单元/集成测试。
2. 跑它们；捕获每个的通过/失败 + 关键输出。
3. 如果因新代码的真实缺陷而失败，应用最小修复并重跑（最多几轮）。不要扩范围。不要提交。
4. 诚实列出不能在本地检查的东西（如真实生产运行时、外部服务、手动 UX），放入 couldNotVerify。

只有当改动代码的相关检查通过时才设 passed=true。返回你实际跑过的命令。`,
    { phase: 'Verify', schema: VERIFY_SCHEMA }
  )
  log(`Verify: passed=${verify?.passed}`)
}

// ───────────────────────── Phase 5: PR ─────────────────────────
// 委派路径（USE_PR_SKILL）：提交，然后交给仓库的 /pr skill，它在
// 开 PR 之前验证功能并跑回归扫描。
// 内联路径：仅在本 workflow 自己的 Verify 通过后开 PR。
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
  log(`openPr=false —— 在 verify 后停下。改动在 worktree ${WT}（分支 ${BRANCH}）内，未提交。`)
} else if (USE_PR_SKILL) {
  phase('PR')
  pr = await agent(
    `提交变更，然后运行本仓库自带的 /pr skill 来验证并交付。在 worktree ${WT}（分支 ${BRANCH}，基线 ${BASE}）内工作。

/pr skill 要求变更先提交到一个分支上，然后它独立验证功能（一个 verifier 子 agent 驱动运行中的应用）并在开 PR 之前跑回归扫描。不要抢在它之前自己开 PR —— 让 skill 把关。

步骤:
1. cd ${WT}；查看 \`git status\` 和 \`git --no-pager diff\`，确保提交只含目标文件（无杂散/无关文件）。
2. git add 目标文件；用清晰的约定式提交信息提交，概述变更并注明任何刻意的后续项/超出范围项。
3. 读 \`${WT}/.claude/skills/pr/SKILL.md\` 并严格按其流程执行（起栈、委派功能验证、回归扫描、然后带证据开 PR）。全部在 ${WT} 内运行。${VERIFY_HINTS ? `\n   给 verifier 的、来自请求者的验证提示: ${VERIFY_HINTS}` : ''}
4. 返回 PR URL、分支、以及短 commit sha。

如果 skill 的验证在其重试上限内未通过，或 git push / gh 失败（认证/权限），不要强推 —— 返回 prUrl='' 并在 summary 里写明结论/失败原因，让人类来收尾。`,
    { phase: 'PR', schema: PR_SCHEMA }
  )
  log(pr?.prUrl ? `PR 已开: ${pr.prUrl}` : `PR 未开: ${pr?.summary ?? '未知'}`)
} else if (verify && verify.passed) {
  phase('PR')
  pr = await agent(
    `提交已验证的改动并开 PR。在 worktree ${WT}（分支 ${BRANCH}，基线 ${BASE}）内工作。

步骤:
1. cd ${WT}；查看 \`git status\` 和 \`git --no-pager diff\`，确保提交只含目标文件（无杂散/无关文件）。
2. git add 目标文件；用清晰的约定式提交信息提交，概述变更并注明任何刻意的后续项/超出范围项。
3. git push -u origin ${BRANCH}。
4. 开 PR: \`gh pr create --base ${BASE} --head ${BRANCH}\`，带清晰标题和正文，覆盖：做了什么及为什么、执行的验证、以及明确的超出范围/后续项。
5. 返回 PR URL、分支、以及短 commit sha。

如果 git push 或 gh 失败（认证/权限），不要强推 —— 返回 prUrl='' 并在 summary 里写明失败原因，让人类来收尾。`,
    { phase: 'PR', schema: PR_SCHEMA }
  )
  log(pr?.prUrl ? `PR 已开: ${pr.prUrl}` : `PR 未开: ${pr?.summary ?? '未知'}`)
} else {
  log(
    `验证未通过 —— 跳过提交/PR。改动留在 worktree ${WT}（分支 ${BRANCH}）供人类 review。`
  )
}

return { setup, impl, simp, review, verify, pr, worktree: WT, branch: BRANCH }
