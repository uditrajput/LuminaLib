FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    espeak-ng \
    libespeak-ng-dev \
    libsndfile1 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download en_core_web_sm

# Copy app code
COPY . .

# Pre-cache Kokoro and Whisper model weights during build phase so startup is instant
RUN python -c "from app.stt import get_whisper_model; get_whisper_model()" && \
    python -c "from app.tts import get_kokoro_pipeline; get_kokoro_pipeline()"

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
