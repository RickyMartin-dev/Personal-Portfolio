# Luna research: CI and supply-chain security

Role: read-only Luna xhigh specialist

## Findings

- Full-length action SHAs, explicit read-only permissions, checkout credential disabling, and job timeouts are the right baseline for a reusable starter.
- Workflow checks must inspect step actions, named-step actions, and reusable workflow calls; checking only `- uses:` lines creates a false green.
- Job-level permissions can override top-level permissions, so write-capable scopes and broad permission modes must be rejected everywhere.
- Direct `github.event.*` interpolation in shell blocks is an injection boundary and should fail closed in this generic starter.
- Local secret detection is defense in depth; GitHub secret scanning and push protection remain necessary for published copies.

## Implemented decision

The starter now scans every `uses:` reference, rejects broad/write permissions and direct event interpolation, requires pinned SHAs, disables checkout credential persistence, and runs a local negative-path fixture suite.

## Sources

- [GitHub Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub workflow syntax and permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub script injection guidance](https://docs.github.com/en/actions/concepts/security/script-injections)
- [GitHub push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)
