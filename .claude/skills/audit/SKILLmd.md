---
name: audit
description: Cold code review of AI-generated code before running it — list bugs, edge cases, security issues, and silent assumptions. Use before trusting any generated file.
---

Read the specified file(s) or diff. Do NOT run or execute anything yet.

List, plainly, organized by severity (high / medium / low):
1. Bugs or logic errors
2. Missing edge cases — empty state, null/undefined, concurrent access, partial failure
3. Security issues — unvalidated input, exposed data, injection risk
4. Silent assumptions — anything the code assumes without stating it (e.g. a field
   always being present, a call always succeeding)

If a spec or api-reference.md is available (path in $ARGUMENTS, or check the repo
for one), check the code against it line by line and flag every deviation —
including things the code does that the spec never asked for.

Do not fix anything in this pass. Output the list only. Fixes happen after review.
