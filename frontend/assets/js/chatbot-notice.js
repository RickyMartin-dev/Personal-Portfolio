(() => {
  const launcher = document.getElementById('chatbot-button');
  const panel = document.getElementById('chatbot-container');
  const closeButton = document.getElementById('chatbot-close');

  if (!launcher || !panel || !closeButton) return;

  const closeNotice = () => {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  };

  launcher.addEventListener('click', () => {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    closeButton.focus();
  });

  closeButton.addEventListener('click', closeNotice);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) closeNotice();
  });
})();
