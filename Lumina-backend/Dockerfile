FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml README.md ./
COPY luminalib ./luminalib
RUN pip install --no-cache-dir .

COPY . .

EXPOSE 8000

CMD ["uvicorn", "luminalib.main:app", "--host", "0.0.0.0", "--port", "8000"]
