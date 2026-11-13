document.addEventListener('DOMContentLoaded', function () {
  var config = window.CHATBOT_CONFIG || {};
  var endpoint = typeof config.apiEndpoint === 'string' ? config.apiEndpoint.trim() : '';
  var panel = document.getElementById('assist-panel');
  var messages = document.getElementById('chatbot-messages');
  var input = document.getElementById('chatbot-input');
  var form = document.getElementById('chatbot-input-container');
  var send = document.getElementById('chatbot-send');
  var status = document.getElementById('chatbot-status');
  if (!endpoint || !panel || !messages || !input || !form || !send || !status) return;

  var history = [];
  var waiting = false;
  var maxHistoryMessages = 4;
  var maxHistoryChars = 2000;

  function appendMessage(text, kind) {
    var item = document.createElement('div');
    item.className = 'chatbot-message ' + kind;
    var paragraph = document.createElement('p');
    paragraph.textContent = text;
    item.appendChild(paragraph);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  function setWaiting(value) {
    waiting = value;
    input.disabled = value;
    send.disabled = value;
    status.textContent = value ? 'Assistant is responding.' : '';
  }

  function boundedHistory() {
    var result = [];
    var chars = 0;
    for (var index = history.length - 1; index >= 0; index -= 1) {
      var item = history[index];
      if (result.length >= maxHistoryMessages || chars + item.content.length > maxHistoryChars) break;
      result.unshift(item);
      chars += item.content.length;
    }
    return result;
  }

  async function submit(message) {
    appendMessage(message, 'user-message');
    setWaiting(true);
    var typing = document.createElement('div');
    typing.className = 'chatbot-message bot-message typing-message';
    typing.setAttribute('aria-hidden', 'true');
    typing.textContent = 'Thinking…';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    try {
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ input: message, history: boundedHistory() })
      });
      if (response.status === 429) {
        appendMessage('The assistant has reached its request limit for now. Please try again next month.', 'bot-message chatbot-error');
        return;
      }
      if (!response.ok) {
        appendMessage('The assistant is temporarily unavailable. Your question is still here; please try again.', 'bot-message chatbot-error');
        return;
      }
      var data = await response.json();
      if (!data || typeof data.message !== 'string' || !data.message.trim()) {
        appendMessage('The assistant returned an invalid response. Your question is still here; please try again.', 'bot-message chatbot-error');
        return;
      }
      var answer = data.message.trim();
      appendMessage(answer, 'bot-message');
      history.push({ role: 'user', content: message }, { role: 'assistant', content: answer });
      if (history.length > maxHistoryMessages) history.splice(0, history.length - maxHistoryMessages);
      input.value = '';
    } catch (_) {
      appendMessage('Could not connect to the assistant. Your question is still here; please try again.', 'bot-message chatbot-error');
    } finally {
      typing.remove();
      setWaiting(false);
      if (panel.classList.contains('open')) input.focus();
    }
  }

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var message = input.value.trim();
    if (!waiting && message && message.length <= 500) submit(message);
  });
});
