(function () {
  var D = window.AtlasData, el = document.getElementById('catalog');
  el.innerHTML = D.groups.map(function (g) {
    return '<div class="cat-row"><header>' + D.emblem(g, 96) + '<div><h3>' + g.name + '</h3><span class="count">' + g.label + ' &middot; ' + g.tools.length + ' stars</span></div></header>' +
      '<ul class="tools">' + g.tools.map(function (t) { return '<li>' + t[0].replace('&', '&amp;') + '</li>'; }).join('') + '</ul></div>';
  }).join('');
})();
