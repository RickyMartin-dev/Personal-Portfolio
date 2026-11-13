(function () {
  document.querySelectorAll('[data-play]').forEach(function (btn) {
    var pop = document.getElementById(btn.getAttribute('data-play'));
    var t;
    btn.addEventListener('click', function () {
      if (pop) {
        pop.classList.add('is-on');
        clearTimeout(t);
        t = setTimeout(function () { pop.classList.remove('is-on'); }, 3200);
      }
      if (window.RMToast) window.RMToast('Playable in the full release');
    });
  });
})();
