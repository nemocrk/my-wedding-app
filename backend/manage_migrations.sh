#!/bin/bash
set -e

echo "=== Migration Utility ==="
echo "Checking if database is ready..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Database ready."

echo "Creating migrations for 'core'..."
python manage.py makemigrations core

echo "Applying all migrations..."
python manage.py migrate

echo "Done."
