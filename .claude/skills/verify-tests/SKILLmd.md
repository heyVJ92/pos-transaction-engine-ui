---
name: verify-tests
description: Confirm each test actually fails when the behavior it protects is broken — a test that can't fail proves nothing. Use after any AI-generated test is added.
---

For each test file in $ARGUMENTS (or the most recently changed test file if not
specified):

1. Identify what real failure each test claims to catch.
2. Temporarily break the corresponding behavior — one change at a time (revert a
   null check, rename a field, force an error path).
3. Run the test suite and confirm the test actually fails.
4. Revert the break.
5. Report per test: name, what it claims to catch, whether it failed when broken
   (pass/fail), and if it didn't fail, why not.

Flag any test that only covers the happy path, or that asserts the implementation
detail rather than the actual behavior — those are decoration, not trust, and
should be rewritten before merging.
