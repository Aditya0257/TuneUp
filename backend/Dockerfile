FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root user.
RUN useradd --create-home --shell /bin/false tuneup && chown -R tuneup:tuneup /app
USER tuneup

EXPOSE 5000

# 2 workers x 4 threads: the workload is I/O-bound (waiting on YouTube Music),
# and responses are served from the TTL cache most of the time.
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT} --workers 2 --threads 4 --timeout 60 --access-logfile -"]
