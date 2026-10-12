# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `YosefHayim/ebay-mcp`. Use the `gh` CLI for issue-tracker operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` when needed and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

In this fork's clone, `git remote -v` lists two GitHub repos (`origin` = `YosefHayim/ebay-mcp`, `fork` = `jmarler/ebay-mcp`) and no `gh` default repo is set, so pass `--repo YosefHayim/ebay-mcp` explicitly. The fork has GitHub issues disabled; fork-only work is tracked on the `marlermedia` branch, not in issues.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
