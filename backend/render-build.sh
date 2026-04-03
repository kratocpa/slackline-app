#!/usr/bin/env bash
set -e

cd /opt/render/project/src/backend

pip install -r requirements.txt

# Run DB migrations
alembic upgrade head

