## Approach
- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- No sycophantic openers or closing fluff.
- If unsure: say so. Never guess or invent file paths.
- User instructions always override this file.

## Efficiency
- Read before writing. Understand the problem before coding.
- No redundant file reads. Read each file once.
- One focused coding pass. Avoid write-delete-rewrite cycles.
- Test once, fix if needed, verify once. No unnecessary iterations.
- Budget: 50 tool calls maximum. Work efficiently.

## Quality
- When fixing bugs, write a test that reproduces the bug before fixing it.
- When adding features, include tests. Ensure all existing tests pass after changes.
- Prefer the simplest solution that solves the problem. Avoid unnecessary abstractions, indirection, or complexity.
- Base solutions on observed behaviour (logs, errors, test output), not assumptions. Verify the root cause before proposing a fix.
- For performance-sensitive decisions, benchmark rather than theorise. Profile competing approaches and weigh results alongside readability, maintainability, and correctness tradeoffs.
