# backend/Dockerfile

# Usa un'immagine base leggera di Python
FROM python:slim

# Variabili d'ambiente per evitare file .pyc e buffer output
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Imposta la directory di lavoro nel container
WORKDIR /app

# Installa dipendenze di sistema necessarie per PostgreSQL e compilatori
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copia e installa le dipendenze Python
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copia tutto il codice sorgente
COPY . /app/

# Espone la porta (solo documentale, il mapping vero lo fa docker-compose)
EXPOSE 8000

# Comando di default (può essere sovrascritto da docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]