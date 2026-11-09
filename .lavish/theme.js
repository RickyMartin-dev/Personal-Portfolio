// Auto / Light / Dark switch for Lavish pages. Auto follows the system setting.
(() => {
  const root = document.documentElement;
  const key = 'lavish-theme';
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (value) => {
    try { value === 'auto' ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  };
  const apply = (value) => {
    const choice = value === 'light' || value === 'dark' ? value : 'auto';
    if (choice === 'auto') delete root.dataset.theme; else root.dataset.theme = choice;
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === choice));
    });
  };
  apply(read());
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-choice]');
    if (!button) return;
    write(button.dataset.themeChoice);
    apply(button.dataset.themeChoice);
  });
})();
