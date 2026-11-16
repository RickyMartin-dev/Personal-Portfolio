# Legacy chatbot cutover record

The portfolio assistant replaced the experimental chatbot workflow in November 2026. The replacement passed a live API health and inference check before the old test services were retired. The old repository deployment workflow was disabled and its associated repository secrets were removed.

The retirement covered confirmed test APIs, functions, container images, model endpoints, storage, logs, and related test infrastructure. Dormant IAM identities and keys were intentionally left alone because removing account access can affect other work. No identifiers, credentials, resource inventory, or destructive cleanup commands belong in this public project record.

For any future AWS cleanup, identify the caller, inspect current dependencies and ownership, and compare against active Terraform state before making changes. Never reuse an old inventory as a deletion list. The deployment workflow manages only resources declared by this repository's Terraform; it does not remove unrelated AWS resources.
