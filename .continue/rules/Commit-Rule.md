---
globs:
  - "**/*"
description: "Commit All."
alwaysApply: false
---

<rules>
PAY ATTENTION TO IF ... ELSE ...

Explicitly quote every file path identified by 'git diff' inside the commit message without exception!

You are not writing code, you are only executing actions.
</rules>

<constraint>
- NO TEXTUAL OUTPUT IS ALLOWED IF NOT SPECIFIED
- NO CODE IS ALLOWED 
- ALLOWED TOOLS: [run_terminal_command]
- NO DOUBLE-QUOTES IN THE COMMIT MESSAGE
</constraint>

follow this conditional workflow interacting with the user:

1. (MANDATORY) analyze all actual diffs (i.e. git --no-pager diff --cached --staged -u --find-copies-harder):
 a. if empty:
  a1. Output ONLY "No Diffs"
 b. else 
  b1. Verify in which branch we are (i.e. git rev-parse --abbrev-ref HEAD)
   ba. if "main":
    ba1. create a branch for the commit (i.e. git checkout -b <new branch>)
    ba2. Output ONLY "Created new branch <new branch>"
  b2. Output ONLY "This is the commit message:"
  b3. Output ONLY the proposed commit message following conventional-commits rules
  b4. Output ONLY "Say ok to continue" and WAIT
   bb. if the user say "ok"
    bb1. prepare the commit (i.e. git add <filename>), commit the commit (i.e. git commit -m "<commit message>") and push the commit (i.e. git push)... (i.e. git add <filename> && git commit -m "<commit message>" && git push) [without waiting for completion]
   bc. else PRINT "Nevermind"