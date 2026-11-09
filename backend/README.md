# Portfolio chatbot backend

FastAPI + LangGraph API hosted in an AWS Lambda container. The API uses Amazon Bedrock in both local and deployed environments. It stores no conversation state: the browser sends the latest user message plus the most recent history on every request.

## Local setup

Use Python 3.12, then:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

For live local inference, edit `.env` and choose one credential source:

- Set `AWS_BEARER_TOKEN_BEDROCK` to a Bedrock API key with permissions for `bedrock:InvokeModel` and `bedrock:InvokeGuardrailChecks`; or
- Set `AWS_PROFILE` in the shell to a configured AWS CLI/SSO profile and leave the bearer token empty.

The default model is `us.anthropic.claude-haiku-5-5` in `us-east-1`. Keep `BEDROCK_MODEL_ID` and `BEDROCK_REGION` the same locally and in Lambda to test the same model route. Real inference and guardrail checks incur Bedrock usage charges.

Run the local API on port 8001 while serving the static site on port 8000:

```bash
uvicorn src.main:app --reload --host 127.0.0.1 --port 8001
```

Send one live local request with the same Bedrock route configured for Lambda:

```bash
curl -s http://127.0.0.1:8001/health
curl -s http://127.0.0.1:8001/chat \
  -H 'content-type: application/json' \
  -d '{"input":"What has Ricky worked on?","history":[]}'
```

`GET /health` is a no-inference health check. `POST /chat` accepts:

```json
{
  "input": "What has Ricky worked on?",
  "history": [
    {"role": "user", "content": "Who is Ricky?"},
    {"role": "assistant", "content": "Ricky is an AI/ML Engineer."}
  ]
}
```

The `history` field is optional and may contain at most the latest 4 `user` or `assistant` messages (two exchanges). User messages are capped at 500 characters; each history item is capped at 2,000 characters and the total history at 2,000 characters. Responses are limited to 300 Bedrock output tokens and trimmed to at most 2,000 characters, including an ellipsis when trimming is needed. The response is `{"message":"..."}`. No API key is sent by the browser; CORS is a browser policy, while API Gateway throttling is the cost-abuse guard.

## Checks and logging

Bedrock `InvokeGuardrailChecks` is detect-only. The application checks the returned severity scores against `GUARDRAIL_BLOCK_THRESHOLD` (default `0.5`) and returns a generic refusal when a score meets the threshold. It checks harmful content and prompt attacks before inference, then harmful content in the model output. A Bedrock guardrail-check failure fails closed and does not call the model.

Application logs are JSON and contain only request ID, outcome, the configured Bedrock model ID, latency, token counts, guardrail text-unit counts, and error type. They never include chat input/output, session IDs, or raw provider errors. Conversation history exists only in the request and response; there is no S3 transcript logging or server-side persistence.

## Tests

From the repository root, run `./scripts/test.sh` for all local checks. To run the Python API and frontend artifact tests only, from `backend/`:

```bash
python -m pytest tests ../frontend/tests/python
```

Tests use a fake Bedrock Runtime client, so they need no AWS credentials and make no paid model calls. For an explicit live smoke request, use the local API with a valid profile or bearer token and make one `POST /chat` request.
