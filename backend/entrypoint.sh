#!/bin/sh

# Uscita immediata in caso di errore
set -e

echo "Waiting for PostgreSQL..."
# Loop di attesa finché il DB non è pronto (usa nc se disponibile o un check python)
while ! nc -z db 5432; do
  sleep 1
done
echo "Database ready."

echo "Creating migrations for 'core'..."
python manage.py makemigrations core

echo "Applying all migrations..."
python manage.py migrate

echo "Done."

echo "Collecting static files..."
# Raccoglie i file statici (utile in produzione)
python manage.py collectstatic --noinput

echo "Starting server..."
# Esegue il comando passato come argomento al container (es. gunicorn o runserver)
exec "$@"
