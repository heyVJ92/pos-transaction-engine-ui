---
name: diff-check
description: Compare the current diff against a stated spec or api-reference.md, flag missed requirements and scope creep. Use before considering a task done.
---

Given a spec (path in $ARGUMENTS) or api-reference.md by default, and the current
git diff:

1. List every requirement stated in the spec.
2. For each, confirm whether the diff satisfies it fully, partially, or not at all.
3. Flag anything the diff does that the spec did NOT ask for — scope creep, even
   if it looks like an improvement.
4. Flag any requirement that depends on a fact that should be re-verified against
   the live API/repo rather than assumed (e.g. a field assumed present on a
   response, a status code assumed unchanged).

Output as a checklist: requirement → status → note. End with a one-line verdict:
ready to ship, or blocked on [what].
