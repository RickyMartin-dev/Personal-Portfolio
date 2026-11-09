document.addEventListener('DOMContentLoaded', function () {
    const config = window.CHATBOT_CONFIG || {};
    const API_ENDPOINT = typeof config.apiEndpoint === 'string' && config.apiEndpoint.trim()
        ? config.apiEndpoint.trim()
        : '/chat';
    const MAX_MESSAGE_LENGTH = 500;
    const MAX_HISTORY_MESSAGES = 4;
    const MAX_HISTORY_CHARS = 2000;

    const chatbotButton = document.getElementById('chatbot-button');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotForm = document.getElementById('chatbot-input-container');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotStatus = document.getElementById('chatbot-status');

    if (!chatbotButton || !chatbotContainer || !chatbotClose || !chatbotMessages ||
        !chatbotInput || !chatbotForm || !chatbotSend || !chatbotStatus) {
        return;
    }

    let isChatOpen = false;
    let isWaiting = false;
    const conversationHistory = [];

    function setChatOpen(open) {
        isChatOpen = open;
        chatbotContainer.hidden = !open;
        chatbotButton.hidden = open;
        chatbotButton.setAttribute('aria-expanded', String(open));

        if (open) {
            chatbotInput.focus();
        } else {
            chatbotButton.focus();
        }
    }

    function addMessage(message, options = {}) {
        const messageDiv = document.createElement('div');
        const isUser = options.isUser === true;
        messageDiv.className = `chatbot-message ${isUser ? 'user-message' : 'bot-message'}`;
        if (options.isError) messageDiv.classList.add('chatbot-error');

        const messageP = document.createElement('p');
        messageP.textContent = message;
        messageDiv.appendChild(messageP);
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chatbot-message bot-message typing-message';
        typingDiv.setAttribute('aria-hidden', 'true');

        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        for (let index = 0; index < 3; index += 1) {
            indicator.appendChild(document.createElement('span'));
        }
        typingDiv.appendChild(indicator);
        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typing = chatbotMessages.querySelector('.typing-message');
        if (typing) typing.remove();
    }

    function setWaiting(waiting) {
        isWaiting = waiting;
        chatbotInput.disabled = waiting;
        chatbotSend.disabled = waiting;
        chatbotStatus.textContent = waiting ? 'Assistant is responding.' : '';
    }

    function recentHistory() {
        const bounded = [];
        let remainingChars = MAX_HISTORY_CHARS;
        const firstIndex = Math.max(0, conversationHistory.length - MAX_HISTORY_MESSAGES);

        for (let index = conversationHistory.length - 2; index >= firstIndex; index -= 2) {
            const turn = conversationHistory.slice(index, index + 2);
            const turnChars = turn.reduce((total, message) => total + message.content.length, 0);
            if (turn.length !== 2 || turnChars > remainingChars) break;
            bounded.unshift(...turn);
            remainingChars -= turnChars;
        }

        return bounded;
    }

    async function sendMessage(message) {
        if (message.length > MAX_MESSAGE_LENGTH) {
            addMessage(`Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`, { isError: true });
            return;
        }

        addMessage(message, { isUser: true });
        setWaiting(true);
        showTypingIndicator();

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    input: message,
                    history: recentHistory()
                })
            });

            if (response.status === 429) {
                addMessage('Too many requests right now. Please wait a moment and try again.', { isError: true });
                return;
            }

            if (!response.ok) {
                addMessage('Unable to reach the assistant. Please try again.', { isError: true });
                return;
            }

            const data = await response.json();
            if (!data || typeof data.message !== 'string' || !data.message.trim()) {
                addMessage('The assistant returned an invalid response. Please try again.', { isError: true });
                return;
            }

            const reply = data.message.trim();
            addMessage(reply);
            chatbotInput.value = '';
            conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: reply }
            );
            if (conversationHistory.length > MAX_HISTORY_MESSAGES) {
                conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY_MESSAGES);
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            addMessage('Connection error. Please try again later.', { isError: true });
        } finally {
            removeTypingIndicator();
            setWaiting(false);
            if (isChatOpen) chatbotInput.focus();
        }
    }

    chatbotButton.addEventListener('click', function () {
        setChatOpen(true);
    });

    chatbotClose.addEventListener('click', function () {
        setChatOpen(false);
    });

    chatbotForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const message = chatbotInput.value.trim();
        if (message && !isWaiting) sendMessage(message);
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && isChatOpen) {
            setChatOpen(false);
        }
    });
});
