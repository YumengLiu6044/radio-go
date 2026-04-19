# ---- Base image (PyTorch GPU-ready if needed) ----
FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

# ---- Set working directory ----
WORKDIR /app

# ---- Python dependencies ----
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ---- Copy application code ----
COPY . .

# ---- Environment variables (defaults, overridden by ECS) ----
ENV PYTHONUNBUFFERED=1

# ---- Run worker (important: no FastAPI server needed) ----
CMD ["python", "app.py"]