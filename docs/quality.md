# Quality Bar

Quality is evidence, not confidence. The exact project checks belong in `docs/project-commands.md`; this file defines the minimum questions every change should answer.

## Definition of done

- The requested behavior is implemented and scoped to the request.
- Acceptance criteria are explicit and satisfied.
- Relevant automated checks pass.
- Important failure paths have been considered or tested.
- The diff is small enough to review and contains no accidental files.
- Public behavior, setup instructions, and durable architecture knowledge are aligned.
- Security and privacy implications are understood.
- Remaining risks and follow-up work are named.

## Review lenses

1. Correctness: does it do the right thing for normal and edge inputs?
2. Reliability: what happens on timeouts, retries, partial failure, and restart?
3. Security: can untrusted input cross a trust boundary or expose a secret?
4. Maintainability: can the next agent find the source of truth and change it safely?
5. Operability: can a human observe, debug, and recover the behavior?
6. Product fit: does it solve the stated problem without speculative scope?
