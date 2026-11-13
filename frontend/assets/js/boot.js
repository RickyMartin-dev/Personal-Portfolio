/* Runs before first paint (loaded in <head>, no inline script so CSP stays script-src 'self'). */
document.documentElement.classList.add('js');
try {
  if (sessionStorage.getItem('rm-pt')) {
    document.documentElement.classList.add('pt-in');
    sessionStorage.removeItem('rm-pt');
  }
} catch (e) {}
