#!/usr/bin/env bash
# Render build script for the Django app.
# Render runs this once per deploy (see render.yaml -> buildCommand).
set -o errexit

pip install -r requirements.txt

# Collect static files for WhiteNoise to serve.
python manage.py collectstatic --no-input --clear

# Apply database migrations against the Render Postgres (DATABASE_URL).
python manage.py migrate --no-input
