#!/usr/bin/env bash
# One-command launcher (macOS / Linux): installs deps on first run, starts Flask recommender + Node server.
set -e
cd "$(dirname "$0")"

[ -d backend/node_modules ] || (echo ">> installing backend packages"; cd backend && npm install)

if [ ! -d recommender/.venv ]; then
  echo ">> creating Python venv and installing recommender packages"
  python3 -m venv recommender/.venv
  recommender/.venv/bin/pip install -q -r recommender/requirements.txt
fi

recommender/.venv/bin/python recommender/app.py &
REC_PID=$!
trap 'kill $REC_PID 2>/dev/null' EXIT INT TERM

cd backend && npm start
