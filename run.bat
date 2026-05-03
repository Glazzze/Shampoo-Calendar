@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo node was not found. Install Node.js and add node to PATH.
  exit /b 1
)

node server.js
