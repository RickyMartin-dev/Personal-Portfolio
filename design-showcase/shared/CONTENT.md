# Portfolio content — single source of truth for all 7 design versions

Every version must render ALL of this content (re-styled, re-ordered, re-voiced into its world is fine; facts must not change). Do not invent employers, metrics, awards, clients, or personal anecdotes. Where copy is marked AUTHORABLE you may write fresh short copy in the world's voice without adding factual claims.

## Identity
- Name: Ricky Martin
- Positioning title (hero): **Forward Deployed AI Engineer** — full-stack, AI/ML. (Secondary line: "AI/ML Engineer · New York, NY")
- Primary audience: hiring managers and engineering leaders evaluating a senior hire.
- Hero statement (may be tightened, keep meaning): "I build reliable machine learning systems that move from prototype to production and create measurable business impact."
- AUTHORABLE supporting line, e.g. "I embed with teams, ship the full stack — data, models, APIs, and interface — and stay until it works in production."
- Primary CTAs: "View experience" (→ about.html#experience), "Résumé" (no PDF yet: link to `#resume`; clicking shows a small in-world toast "Résumé PDF coming soon — reach out by email meanwhile"), "Get in touch" (→ contact section).
- Photo: `../shared/img/ricky.jpg` (1067×1067 square, warm-lit, white shirt, record shelves behind) and a smaller `../shared/img/ricky-720.jpg`. Required on the About page; optional elsewhere. Alt text: "Portrait of Ricky Martin". Never mask the face with a geometric cutout that clips the head; rounded rect, in-world frame, or full-bleed crop is fine.

## Proof numbers (present in-world — NOT as a generic big-number/small-label stat row)
- 8+ years of professional development experience
- 50+ projects shipped or containerized to production
- 1000+ models trained or fine-tuned
- Millions of dollars added to shareholder value (owner-supplied, 2026-11-12)
- "a million+ tokens used for the greater good" (playful; optional)

## Selected work (Home)
1. **Agentic RAG Chatbot for Enterprise Knowledge** — LLM Platform. Led full-stack development of a secure internal assistant using Bedrock, FAISS, LangGraph, Streamlit, and LangSmith, adopted across the organization (80+ employees). Link: https://github.com/RickyMartin-dev/Website_AI_Chatbot ("View related work")
2. **End-to-End Disease Classification** — Computer Vision · MLOps. Image-based diagnosis pipeline with MLflow, DVC, TensorFlow, Flask, Docker, and AWS for reproducible experimentation and deployment. Link: https://github.com/RickyMartin-dev/End-to-End-CancerClassification
3. **Affective Touch Classification with Soft Sensor Skins** — Research Publication (IEEE-RAS). Primary developer; rapidly manufacturable soft sensors + ML classification for tactile understanding. Link: https://ieeexplore.ieee.org/document/9116023

Authored diagrams/illustrations of these systems (architecture flow, pipeline stages, sensor grid) are encouraged — they demonstrate engineering depth. Keep labels truthful to the stacks listed.

## Current focus (Home)
- **LLM Systems** — Designing secure, domain-aware assistants and task agents that combine retrieval, orchestration, and reliable evaluation loops.
- **MLOps and Reliability** — Automating training, drift checks, model monitoring, and deployment paths so data products remain stable under changing production conditions.
- **Business Impact** — Partnering with product and operations teams to tie model outputs to clear outcomes such as cost savings, faster decisions, and safer systems.

## Toolkit (group it; do not dump as one marquee)
- LLM & agents: Anthropic, OpenAI, LangChain, LangGraph, LangSmith, LlamaIndex, CrewAI, Hugging Face, Transformers
- ML & data: Python, NumPy, Pandas, Polars, SciPy, scikit-learn, XGBoost, LightGBM, PyTorch, TensorFlow, CUDA, Matplotlib, Seaborn, Jupyter
- MLOps: MLflow, Weights & Biases, Optuna, Ray, Airflow, Spark
- Cloud & infra: AWS (SageMaker, Lambda, S3, EC2, DynamoDB), GCP, Docker, Kubernetes, Terraform, GitHub Actions, Linux, Bash
- Apps & data stores: FastAPI, Flask, Streamlit, React, TypeScript, JavaScript, PostgreSQL, SQL, Redis, Pinecone, Pydantic

## About page
Heading idea: "Engineer first, researcher always." Sub: "I specialize in taking AI ideas from notebooks to reliable software that teams can trust in production."

Profile:
- I am a machine learning engineer with 8+ years of experience building and deploying production-grade systems across healthcare, security, and enterprise workflows. My work spans classical ML, time-series modeling, and modern LLM-based applications.
- I focus on architecture and execution: secure integrations, robust data pipelines, model reliability, and measurable impact for business teams. I like shipping quickly, learning from user feedback, and iterating toward systems that are both powerful and maintainable.

Experience (id="experience"):
- **Jul 2023 – Present · DCCA · AI/ML Engineer**
  - Led development of a secure internal Agentic RAG chatbot stack on EC2 and scaled adoption to 80+ employees.
  - Deployed and monitored GPU-accelerated Llama 2/3 SageMaker endpoints for summarization, SQL assistance, and report generation POCs.
  - Productionized a drug price forecasting API with 5–11% error rates to enable proactive planning.
  - Scaled PySpark anomaly detection workflows that surfaced potentially fraudulent charges at large volume.
- **Jan 2022 – May 2023 · Ardent · ML Engineer**
  - Built 20+ containerized training and serving pipelines for microservice health models using scikit-learn, PyTorch, and AWS.
  - Improved model quality on skewed OCR data through TF-IDF, XGBoost, and SMOTE, achieving PR-AUC of 0.91.
  - Implemented time-series anomaly detection for security logs, reducing incident detection latency by 80%.
- **Oct 2020 – Oct 2021 · Redica Systems · Data Scientist**
  - Developed semi-supervised DBSCAN segmentation with TF-IDF and NLP techniques, saving 64+ business hours each month.
  - Engineered feature sets that improved precision and recall by 10% on supervised models.
- **May 2018 – Jun 2021 · UCSD Bio-Inspired Robotics Lab · Data Science Researcher**
  - Built ML-on-edge sensor pipelines with Python, C++, CUDA, and deep learning for live robotics data.
  - Created GAN-based synthetic data generation to improve model generalization.
  - Published work in IEEE-RAS on affective touch classification.

Life outside code (interests only — AUTHORABLE one-line captions, but no invented specific trips/achievements): Travel, Hiking, Music (he has a Spotify artist page), Surfing, Photography, Coffee, Outdoors, Reading. Mark captions visually as placeholders only via a subtle "photo coming soon" slot where an image would go.

## Games page ("Games" / in-world name ok) — MOCKUP ONLY
Intro: "Built for fun. Playable in your browser. Pure HTML, CSS, and JavaScript — no downloads, no plugins."
- **Tetris** — Puzzle. Classic block-stacking puzzle. Clear lines, level up, and survive as long as you can. (status: Playable on live site)
- **Road Racer** — Arcade. Top-down road racer. Dodge oncoming traffic at increasing speeds — how far can you go? (status: Playable on live site)
- **Coming soon** — "Something new is taking shape on the workbench."
- **Coming soon** — "Another idea in the queue. Will ship when it's actually fun."
Render each game as a beautiful in-world card/cabinet/plate WITH an authored preview image of the game (SVG/CSS/canvas illustration — e.g. stacked tetromino well, top-down road with cars). "Play" opens a small in-world preview state or toast: "Playable in the full release" — no real game code.

## Contact (on every page footer or a dedicated block)
Heading idea: "Looking for a builder who can ship modern AI products?" / "Interested in building ambitious AI products together?"
Form: Name, Email, Message, Send. MOCK ONLY: on submit, preventDefault, validate (required + email format, with inline error text), then show an in-world success state. No network request.
Links: LinkedIn https://www.linkedin.com/in/rickylm/ · GitHub https://github.com/RickyMartin-dev · Kaggle https://www.kaggle.com/rickymartindev · Spotify https://open.spotify.com/artist/7slfeZO9LsJbWgpkIoXBUJ · Email mailto:rickylenmartin@gmail.com · New York, NY
Footer: © Ricky Martin.

## AI assistant launcher
A small in-world launcher ("Ask about Ricky") that opens an accessible panel saying the assistant is under construction: "Ricky's AI assistant is being rebuilt. Check back soon." It sends no requests.

## Navigation
Home (index.html) · About (about.html) · Games (games.html) + a theme toggle (light/dark). Same three pages in every version.
