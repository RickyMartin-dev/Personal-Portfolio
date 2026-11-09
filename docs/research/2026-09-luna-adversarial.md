# Luna research: adversarial acceptance

Role: read-only Luna xhigh specialist

## Findings

- A green happy-path check is insufficient for security controls; each validator needs representative false-green fixtures.
- Staged and unstaged changes must be checked relative to `HEAD` before a release; a worktree-only diff can miss staged whitespace errors.
- Manifest checks must detect contract drift, not just key spelling. Every hardening check and referenced path must be present.
- Negative tests should assert the intended failure reason so a check cannot pass for an unrelated failure.

## Implemented decision

`check-hardening-fixtures.sh` now tests credential patterns, generic private-key headers, unpinned/named workflow actions, multiline event injection, job-level permission escalation, unsafe instructions, and manifest check drift. The release gate checks the complete tracked diff relative to `HEAD`.

## Sources

- [GitHub script injection guidance](https://docs.github.com/en/actions/concepts/security/script-injections)
- [GitHub workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub secret scanning scope](https://docs.github.com/en/code-security/reference/secret-security/secret-scanning-scope)
- [GitHub Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
