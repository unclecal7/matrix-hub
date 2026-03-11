#!/bin/bash
cd ~/Documents/Matrix\ Hub/matrix-hub

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SIM_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $SIM_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

# 1) Start the Videohub simulator on localhost:9990
echo "Starting Videohub simulator (12x12)..."
MATRIX_SIZE=12 npm run simulate:videohub &
SIM_PID=$!
sleep 2

# 2) Start the backend (connects to simulator at 127.0.0.1:9990)
echo "Starting backend..."
VIDEOHUB_IP=127.0.0.1 DISABLE_ATEM=1 npm start &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend on :8080..."
for i in $(seq 1 40); do
  curl -sf http://localhost:8080/api/devices > /dev/null 2>&1 && break
  sleep 0.5
done
echo "Backend ready."

# 3) Start the frontend
echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend then open browser
for i in $(seq 1 40); do
  curl -sf http://localhost:5173 > /dev/null 2>&1 && break
  sleep 0.5
done
echo "Opening http://localhost:5173"
open http://localhost:5173

echo "Stack running. Press Ctrl+C to stop."
wait $SIM_PID $BACKEND_PID $FRONTEND_PID
