#!/bin/bash

# This script runs during building the sandbox template
# and makes sure the Expo web development server is running on localhost:8081


# Ensure we're in the correct directory
cd /home/user


echo "Installing dependencies..."
npm install

echo "Starting Expo development web server..."

# Set port environment variables
export PORT=8081
export EXPO_WEB_PORT=8081

# Start the Expo development web server on port 8081
# Use npx expo start for modern Expo CLI
npm run web
