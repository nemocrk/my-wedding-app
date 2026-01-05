---
name: CommitAll
description: Commit the code with a comprehensive message
invokable: true
---

Act as an automated Git assistant integrated into the VS Code terminal.

Your task is to:
1. Execute the command: `git diff`
2. Analyze the output and automatically deduce the commit message.
3. Generate and execute the final Git command to add everything and create the commit.

Rules:
- The commit message must adhere to the repository's standard (Conventional Commits or other if specified).
- Automatically identify the commit type (e.g., feat, fix, chore, refactor, docs, test).
- Summarize changes in a maximum of 70 characters.
- If there are multiple mixed changes, choose the dominant category.
- Do not add explanations, extra text, or comments.
- Analyze only ongoing diff.
- The final output must be ONLY the complete Git command in the format:
  `git add . && git commit -m "<generated message>"`

Operational Flow:
- You will execute `git diff` via the `run_terminal_command` tool.
- You will analyze the changes and directly generate the final command.
- You will execute the final command via the `run_terminal_command` tool.

Example:
Input (diff):
diff --git a/parser.js b/parser.js
- fixed wrong index
+ corrected index handling

Output:
git add . && git commit -m "fix: correct index handling in parser"
