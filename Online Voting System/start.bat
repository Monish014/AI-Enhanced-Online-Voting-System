@echo off
echo Starting AI Voting System...
echo.

start "Backend - VoteAI" cmd /k "cd /d "C:\Users\monis\Downloads\Online Voting System\backend" && npm run dev"

timeout /t 3 /nobreak > nul

start "Frontend - VoteAI" cmd /k "cd /d "C:\Users\monis\Downloads\Online Voting System\frontend" && npm run dev"

timeout /t 5 /nobreak > nul

start "" "http://localhost:5173"

echo Both servers started!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
