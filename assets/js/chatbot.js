// Vanilla JavaScript Chatbot Implementation
document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const API_ENDPOINT = 'YOUR_API_GATEWAY_ENDPOINT_HERE';
    const API_KEY = 'YOUR_API_KEY_HERE';
    
    // Chat history
    let chatHistory = [];
    let isChatOpen = false;
    
    // Get DOM elements
    const chatbotButton = document.getElementById('chatbot-button');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');
    
    // Toggle chat
    function toggleChat() {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            chatbotContainer.style.display = 'flex';
            chatbotButton.style.display = 'none';
            chatbotInput.focus();
        } else {
            chatbotContainer.style.display = 'none';
            chatbotButton.style.display = 'flex';
        }
    }
    
    // Add message to chat
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${isUser ? 'user-message' : 'bot-message'}`;
        
        const messageP = document.createElement('p');
        messageP.textContent = message;
        messageDiv.appendChild(messageP);
        
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    // Show typing indicator
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
    
    // Remove typing indicator
    function removeTypingIndicator() {
        const typingMessage = document.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }
    
    // Send message
    async function sendMessage(message) {
        addMessage(message, true);
        chatHistory.push({ role: 'user', content: message });
        chatbotInput.value = '';
        showTypingIndicator();
        
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({
                    message: message,
                    history: chatHistory,
                    sessionId: getSessionId()
                })
            });
            
            const data = await response.json();
            removeTypingIndicator();
            
            const botMessage = data.message || 'Sorry, I couldn\'t process that request.';
            addMessage(botMessage);
            chatHistory.push({ role: 'assistant', content: botMessage });
            
        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessage('Sorry, I\'m having trouble connecting. Please try again later.');
        }
    }
    
    // Get session ID
    function getSessionId() {
        let sessionId = localStorage.getItem('chatbot_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chatbot_session_id', sessionId);
        }
        return sessionId;
    }
    
    // Event listeners
    chatbotButton.addEventListener('click', toggleChat);
    chatbotClose.addEventListener('click', toggleChat);
    
    chatbotSend.addEventListener('click', function() {
        const message = chatbotInput.value.trim();
        if (message) {
            sendMessage(message);
        }
    });
    
    chatbotInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const message = chatbotInput.value.trim();
            if (message) {
                sendMessage(message);
            }
        }
    });
});