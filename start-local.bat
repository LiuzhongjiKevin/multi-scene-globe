@echo off
cd /d "%~dp0"
echo Open http://localhost:8080 in your browser.
where python >nul 2>nul
if errorlevel 1 (
  py -m http.server 8080 --bind 127.0.0.1 --directory dist
) else (
  python -m http.server 8080 --bind 127.0.0.1 --directory dist
)
pause
