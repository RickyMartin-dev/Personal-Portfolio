from src.config import SYSTEM_PROMPT


def test_selected_project_stack_matches_portfolio() -> None:
    prompt = " ".join(SYSTEM_PROMPT.split())
    assert "Amazon Bedrock, FAISS, LangGraph, Streamlit, and LangSmith" in prompt
    assert "LangChain is listed as a general skill" in prompt
    assert "not listed in that project's stack" in prompt


def test_v0_capabilities_are_not_confused_with_future_rag_work() -> None:
    prompt = " ".join(SYSTEM_PROMPT.split())
    assert "does not currently use a RAG index" in prompt
    assert "persistent conversation history" in prompt
