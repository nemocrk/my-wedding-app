# backend/Dockerfile
# Multi-stage build for development and production

# ==============================================
# Stage 1: Base - Common dependencies
# ==============================================
FROM python:slim AS base

# Variabili d'ambiente per evitare file .pyc e buffer output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Imposta la directory di lavoro nel container
WORKDIR /app

# Installa dipendenze di sistema necessarie
# netcat-openbsd serve per lo script di wait-for-db
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    netcat-openbsd \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ==============================================
# Stage 2: Development
# ==============================================
FROM base AS development

# Copia e installa le dipendenze Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copia script entrypoint e rendilo eseguibile
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copia tutto il codice sorgente
COPY . /app/

# Espone la porta
EXPOSE 8000

# Entrypoint per gestire migrazioni
ENTRYPOINT ["entrypoint.sh"]

# Comando di default per development (hot-reload)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ==============================================
# Stage 3: Production
# ==============================================
FROM base as production

# Copia e installa le dipendenze Python + Gunicorn
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt gunicorn

# Copia script entrypoint e rendilo eseguibile
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copia tutto il codice sorgente
COPY . /app/

# Crea utente non-root per sicurezza
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Espone la porta
EXPOSE 8000

# Entrypoint per gestire migrazioni
ENTRYPOINT ["entrypoint.sh"]

# Comando di default per production (Gunicorn)
CMD ["gunicorn", "wedding.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]
