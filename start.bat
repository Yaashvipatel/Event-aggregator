@echo off
REM One-command launcher (Windows): installs deps on first run, starts Flask recommender + Node server.
cd /d "%~dp0"

if not exist backend\node_modules (
  echo >> installing backend packages
  pushd backend & call npm install & popd
)
if not exist recommender\.venv (
  echo >> creating Python venv and installing recommender packages
  python -m venv recommender\.venv
  recommender\.venv\Scripts\pip install -q -r recommender\requirements.txt
)

start "Recommender (Flask)" /min recommender\.venv\Scripts\python recommender\app.py
cd backend
call npm start
taskkill /fi "WINDOWTITLE eq Recommender (Flask)*" >nul 2>&1
