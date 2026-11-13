(function () {
  var bar = document.querySelector('.hotbar');
  if (!bar) return;
  var items = {
    Travel: 'Maps, trains, and one good carry-on.',
    Hiking: 'Trails are where the best debugging happens.',
    Music: 'Always listening, with a Spotify artist page to show for it.',
    Surfing: 'Waiting for sets and learning patience.',
    Photography: 'Chasing good light.',
    Coffee: 'Fuel, ritual, and the occasional strong opinion.',
    Outdoors: 'Fresh air as a reset button.',
    Reading: 'A stack that only ever grows.'
  };
  var btns = Array.prototype.slice.call(bar.querySelectorAll('.hb'));
  var title = document.getElementById('hb-title');
  var cap = document.getElementById('hb-cap');
  function pick(b) {
    btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var n = b.dataset.name;
    title.textContent = n;
    cap.textContent = items[n];
  }
  btns.forEach(function (b, i) {
    b.addEventListener('click', function () { pick(b); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var t = btns[(i + d + btns.length) % btns.length];
      t.focus(); pick(t);
    });
  });
})();
