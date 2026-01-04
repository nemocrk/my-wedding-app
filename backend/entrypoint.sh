#!/bin/sh

# Uscita immediata in caso di errore
set -e

# Funzione per eseguire comandi come appuser se esiste e siamo root
run_as_appuser() {
    if [ "$(id -u)" = "0" ] && id "appuser" > /dev/null 2>&1; then
        gosu appuser "$@"
    else
        "$@"
    fi
}

# Se siamo root e esiste appuser, fixiamo permessi delle cartelle critiche
if [ "$(id -u)" = "0" ] && id "appuser" > /dev/null 2>&1; then
    echo "Fixing permissions for appuser..."
    mkdir -p /app/staticfiles /app/media
    chown -R appuser:appuser /app/staticfiles /app/media
fi

echo "Waiting for PostgreSQL..."
# Loop di attesa finché il DB non è pronto (usa nc se disponibile o un check python)
while ! nc -z db 5432; do
  sleep 1
done
echo "Database ready."

echo "Creating migrations for 'core'..."
run_as_appuser python manage.py makemigrations core

echo "Applying all migrations..."
run_as_appuser python manage.py migrate

echo "Done."

echo "Collecting static files..."
# Raccoglie i file statici (utile in produzione)
run_as_appuser python manage.py collectstatic --noinput

echo "Starting server..."
# Se siamo root ed esiste appuser, usa gosu per lanciare il comando finale (es. gunicorn)
if [ "$(id -u)" = "0" ] && id "appuser" > /dev/null 2>&1; then
    exec gosu appuser "$@"
else
    exec "$@"
fi
