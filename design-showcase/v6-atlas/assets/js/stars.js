(function () {
  function rng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var G = [
    { id: 'llm', name: 'LLM Systems', label: 'LLM & agents', seed: 5, angle: -60,
      desc: 'Designing secure, domain-aware assistants and task agents that combine retrieval, orchestration, and reliable evaluation loops.',
      tools: [['LangGraph', 1], ['Anthropic', 1], ['OpenAI', 2], ['LangChain', 2], ['LangSmith', 2], ['LlamaIndex', 3], ['CrewAI', 3], ['Hugging Face', 2], ['Transformers', 3]] },
    { id: 'mlops', name: 'MLOps', label: 'MLOps', seed: 23, angle: 12,
      desc: 'Automating training, drift checks, model monitoring, and deployment paths so data products remain stable under changing production conditions.',
      tools: [['MLflow', 1], ['Weights & Biases', 2], ['Optuna', 3], ['Ray', 3], ['Airflow', 2], ['Spark', 2]] },
    { id: 'data', name: 'Data & ML', label: 'ML & data', seed: 41, angle: 84,
      desc: 'Classical ML, time-series modeling, and deep learning on the Python data stack.',
      tools: [['Python', 1], ['PyTorch', 1], ['TensorFlow', 2], ['scikit-learn', 2], ['NumPy', 3], ['Pandas', 2], ['Polars', 3], ['SciPy', 3], ['XGBoost', 3], ['LightGBM', 3], ['CUDA', 2], ['Matplotlib', 3], ['Seaborn', 4], ['Jupyter', 3]] },
    { id: 'cloud', name: 'Cloud & Infra', label: 'Cloud & infra', seed: 7, angle: 156,
      desc: 'Containerized, reproducible deployment paths across AWS and GCP.',
      tools: [['AWS', 1], ['Docker', 1], ['SageMaker', 2], ['Lambda', 3], ['S3', 3], ['EC2', 3], ['DynamoDB', 3], ['GCP', 2], ['Kubernetes', 2], ['Terraform', 2], ['GitHub Actions', 3], ['Linux', 3], ['Bash', 4]] },
    { id: 'apps', name: 'Applications', label: 'Apps & data stores', seed: 61, angle: 228,
      desc: 'APIs, interfaces, and data stores that put models in front of the people who use them.',
      tools: [['FastAPI', 1], ['React', 2], ['TypeScript', 2], ['Flask', 3], ['Streamlit', 3], ['JavaScript', 3], ['PostgreSQL', 2], ['SQL', 3], ['Redis', 3], ['Pinecone', 3], ['Pydantic', 3]] }
  ];

  function layout(g, R) {
    var r = rng(g.seed), n = g.tools.length, pts = [], dmin = R * 1.75 / Math.sqrt(n), tries = 0;
    while (pts.length < n) {
      var a = r() * 6.2832, d = Math.sqrt(r()) * R;
      var p = { x: Math.cos(a) * d * 1.08, y: Math.sin(a) * d * 0.92 };
      var ok = pts.every(function (q) { return Math.hypot(q.x - p.x, q.y - p.y) > dmin; });
      if (ok) { pts.push(p); tries = 0; } else if (++tries > 80) { dmin *= 0.9; tries = 0; }
    }
    var cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p.x / n; cy += p.y / n; });
    pts.forEach(function (p) { p.x -= cx; p.y -= cy; p.d = Math.hypot(p.x, p.y); });
    var order = g.tools.map(function (t, i) { return i; }).sort(function (a, b) { return g.tools[a][1] - g.tools[b][1]; });
    pts.sort(function (a, b) { return a.d - b.d; });
    pts.forEach(function (p, i) { var t = g.tools[order[i]]; p.name = t[0]; p.mag = t[1]; });
    var inT = [0], edges = [], used = {};
    while (inT.length < n) {
      var best = null;
      inT.forEach(function (i) {
        for (var j = 0; j < n; j++) if (inT.indexOf(j) < 0) {
          var dd = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (!best || dd < best.d) best = { i: i, j: j, d: dd };
        }
      });
      edges.push([best.i, best.j]); used[best.i + '-' + best.j] = 1; used[best.j + '-' + best.i] = 1; inT.push(best.j);
    }
    var ex = null;
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) if (!used[i + '-' + j]) {
      var dd = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (!ex || dd < ex.d) ex = { i: i, j: j, d: dd };
    }
    if (ex && n > 5) edges.push([ex.i, ex.j]);
    return { pts: pts, edges: edges, R: R };
  }

  function radius(m) { return [0, 4.6, 3.5, 2.6, 1.9][m]; }

  function emblem(g, size) {
    var L = layout(g, 40), d = '';
    L.edges.forEach(function (e) { d += 'M' + L.pts[e[0]].x.toFixed(1) + ' ' + L.pts[e[0]].y.toFixed(1) + 'L' + L.pts[e[1]].x.toFixed(1) + ' ' + L.pts[e[1]].y.toFixed(1); });
    var s = '<svg class="emblem" viewBox="-62 -52 124 104" width="' + size + '" aria-hidden="true" focusable="false"><path d="' + d + '" class="em-line"/>';
    L.pts.forEach(function (p) { s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (radius(p.mag) * 1.15).toFixed(1) + '" class="em-star"/>'; });
    return s + '</svg>';
  }

  window.AtlasData = { groups: G, layout: layout, rng: rng, emblem: emblem, radius: radius };
})();
