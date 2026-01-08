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
</constraint>

follow this conditional workflow interacting with the user:

1. analyze all actual diffs (i.e. git diff --staged):

 a. if "The current diff is empty":

  a1. Output ONLY "No Diffs"

 b. else 

  b1. Output ONLY "This is the commit message:"

  b2. Output ONLY the proposed commit message following conventional-commits rules

  b3. Output ONLY "Say ok to continue" and WAIT

   ba. if the user say "ok"

    ba1. prepare the commit (i.e. git add <filename>), commit the commit (i.e. git commit -m "<commit message>") and push the commit (i.e. git push)... (i.e. git add <filename> && git commit -m "<commit message>" && git push)

   bb. else PRINT "Nevermind"