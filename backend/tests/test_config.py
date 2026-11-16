from src.config import SYSTEM_PROMPT


def test_selected_project_stack_matches_portfolio() -> None:
    assert (
        "Amazon Bedrock, FAISS, LangGraph, Streamlit, and LangSmith"
        in SYSTEM_PROMPT
    )
    assert "LangChain is listed as a general skill" in SYSTEM_PROMPT
    assert "not listed in that project's stack" in SYSTEM_PROMPT


def test_v0_capabilities_are_not_confused_with_future_rag_work() -> None:
    assert "does not currently use a" in SYSTEM_PROMPT
    assert "RAG index or persistent conversation history" in SYSTEM_PROMPT
