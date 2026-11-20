# Current task: Restore the public portfolio chatbot

## Objective

Restore the visitor-facing chatbot using the reviewed production endpoint. Keep production inference and privacy controls intact, keep local builds disabled without an endpoint, and block Pages publication unless the generated artifact and live API health/CORS checks pass.

## Test-phase status

- The target change builds an active production client from the tracked endpoint and keeps the local no-endpoint fallback disabled.
- Focused backend tests covered response sanitization, Nova Micro selection, bounded temporary history, safety checks, monthly quota, caller throttling, and configuration; deployment and builder contract tests passed.
- The active mocked chat browser flow passed. The local fallback browser flow displayed the rebuilding notice and made no API requests.
- A build using the tracked production endpoint passed the artifact/config/CSP verifier. The live API health route and exact Pages-origin CORS preflight passed; no chat prompt or model inference was sent.
- A screenshot of the open chat panel from the production-configured build is available in the run evidence directory.
- Generated build, browser-test, dependency, and Python cache directories were removed after validation.

## Remaining work

The test phase is complete. The outer executor owns the remaining review, CI, protected develop PR, and deployment steps. This phase did not run the full repository test suite.

## Previous task context: CI/CD and infrastructure

This repository previously tracked a cross-repository CI/CD and infrastructure task for Personal-Portfolio and the private Vault Agent Lab.

- Portfolio release routing, endpoint protection, and verified Pages artifact reuse were implemented. The current portfolio contract activates the chatbot in production from its reviewed endpoint; local builds remain disabled without an endpoint.
- Vault CI/IaC and Cloudflare Pages controls were handled separately by `RickyMartin-dev/Vault` PR #7. The earlier notes recorded a missing Cloudflare Pages API token, required Terraform adoption/import work, and owner review of protected branch checks.
- The portfolio private Agent Lab link was previously added and deployed through PR #52; PR #53 fixed unique Pages artifacts for deployment retries.
