#!/bin/bash

# Change to the directory where the script is located, then into matrix-hub
cd "$(dirname "$0")/matrix-hub"

echo "========================================="
echo "Starting Videohub Simulator (120x120)..."
echo "========================================="
MATRIX_SIZE=120 npx tsx tests/simulator/videohub-simulator.ts &
SIM_PID=$!

echo "Waiting for simulator to start..."
sleep 2

echo ""
echo "========================================="
echo "Running Phase 1 Validation..."
echo "========================================="
npx tsx tests/phase1-validation.ts

echo ""
echo "========================================="
echo "Cleaning up background processes..."
echo "========================================="
kill $SIM_PID

echo "Test complete! You can close this window."
