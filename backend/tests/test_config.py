from src.config import SYSTEM_PROMPT


def test_selected_project_stack_matches_portfolio() -> None:
    prompt = " ".join(SYSTEM_PROMPT.split())
    assert "Amazon Bedrock, FAISS, LangGraph, Streamlit, and LangSmith" in prompt
    assert "LangChain is a general skill" in prompt
    assert "was not part of that project's stack" in prompt


def test_prompt_matches_temporary_history_and_configured_rag() -> None:
    prompt = " ".join(SYSTEM_PROMPT.split())
    assert "temporary browser memory" in prompt
    assert "not persistent conversation history" in prompt
    assert "The tool is available only when the knowledge base is configured" in prompt
