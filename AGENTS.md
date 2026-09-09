# lesouskill — agent instructions

## Prime Directive

**It is strictly prohibited to write and/or commit directly to `main`.**

For every task, create a **new branch and a new linked Git worktree** under
`.worktrees/`, starting from the latest `origin/main`. Do not reuse an existing
worktree for a new task. All file edits, commits, and pushes must happen in that
task's worktree on its feature branch.

The primary checkout stays on `main` as a tracking copy. Never switch it to a
feature branch, commit on `main`, or push commits directly to `main`. Preserve
unrelated local changes; do not stage, discard, or overwrite another task's work.

When the task is complete, validate the changes, commit, push the feature branch,
and open a pull request targeting `main`. Merge the pull request into `main`.
Only after confirming that the merge succeeded, fast-forward the primary checkout
and remove the completed task's clean worktree and local feature branch. If the
merge is blocked, keep the worktree and report the blocker.

### Required workflow

Start in the primary checkout on `main`. Replace the placeholders with a unique
branch and worktree name for the task.

```bash
# 1. Create a new branch and worktree from the latest main.
git fetch origin
git worktree add -b <type>/<task> .worktrees/<task> origin/main
cd .worktrees/<task>

# 2. Make and validate the changes here. Stage only this task's files.
git add <task-files>
git commit -m "<message>"
git push -u origin HEAD

# 3. Open a pull request and merge it after the required checks pass.
gh pr create --base main
gh pr merge <pr-number> --merge

# 4. After the merge is confirmed, refresh main and clean up this task.
cd ../..
git pull --ff-only origin main
git worktree remove .worktrees/<task>
git branch -d <type>/<task>
```

Do not use force to remove a dirty worktree or delete an unmerged branch.
