// Vanilla JavaScript Chatbot Implementation
document.addEventListener('DOMContentLoaded', function () {
    // Configuration
    const API_ENDPOINT = 'https://wcjd9zbi85.execute-api.us-east-1.amazonaws.com/chat';
    const API_KEY = "for_now_this_is_for_testing";

    // Chat state
    let isChatOpen = false;

    // DOM elements
    const chatbotButton = document.getElementById('chatbot-button');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');

    // Toggle chat window
    function toggleChat() {
        isChatOpen = !isChatOpen;
        chatbotContainer.style.display = isChatOpen ? 'flex' : 'none';
        chatbotButton.style.display = isChatOpen ? 'none' : 'flex';
        if (isChatOpen) chatbotInput.focus();
    }

    // Append message to chat
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${isUser ? 'user-message' : 'bot-message'}`;

        const messageP = document.createElement('p');
        messageP.textContent = message;
        messageDiv.appendChild(messageP);

        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // Typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chatbot-message bot-message typing-message';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typing = document.querySelector('.typing-message');
        if (typing) typing.remove();
    }

    // Session ID
    function getSessionId() {
        let sessionId = localStorage.getItem('chatbot_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chatbot_session_id', sessionId);
        }
        return sessionId;
    }

    // Send message to backend
    async function sendMessage(message) {
        addMessage(message, true);
        chatbotInput.value = '';
        showTypingIndicator();

        try {
            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                    'accept': 'application/json'
                },
                body: JSON.stringify({
                    input: message,
                    session_id: getSessionId()
                })
            });

            const data = await res.json();
            removeTypingIndicator();

            const reply = data.message || 'Sorry, I couldn’t process that.';
            addMessage(reply);

        } catch (err) {
            console.error(err);
            removeTypingIndicator();
            addMessage('Connection error. Try again later.');
        }
    }

    // Event handlers
    chatbotButton.addEventListener('click', toggleChat);
    chatbotClose.addEventListener('click', toggleChat);

    chatbotSend.addEventListener('click', function () {
        const message = chatbotInput.value.trim();
        if (message) sendMessage(message);
    });

    chatbotInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const message = chatbotInput.value.trim();
            if (message) sendMessage(message);
        }
    });
});
