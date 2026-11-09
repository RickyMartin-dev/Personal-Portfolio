# Security Policy

## Supported versions

The `main` branch is the supported version of this starter. Published copies should run the security checks from the revision they use.

## Reporting a vulnerability

Do not open a public issue with credentials, private keys, exploit payloads, or sensitive repository content. Contact the repository owner through a private GitHub security advisory or another private channel agreed with the owner.

Include the affected revision, reproduction steps that do not disclose secrets, impact, and a suggested mitigation when available. Allow time for confirmation and remediation before public disclosure.

If a secret may have been exposed, revoke or rotate it immediately and preserve only the minimum evidence needed for investigation. Do not rewrite history as a substitute for rotation.

## Security expectations for copies

Projects generated from this starter must replace placeholder commands and document their real runtime, dependency, deployment, and secret-management model. Run `./scripts/project release-check` before publishing changes.
