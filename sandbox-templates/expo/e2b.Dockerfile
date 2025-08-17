# You can use most Debian-based base images
FROM node:21-slim

# Install curl and other dependencies needed for React Native
RUN apt-get update && apt-get install -y curl git && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# Install dependencies and customize sandbox
WORKDIR /home/user

# Install Expo CLI globally
RUN npm install -g @expo/cli@latest

# Install ngrok used by Expo tunnels
RUN npm install -g @expo/ngrok@^4.1.0

# Create Expo app with TypeScript and web support
RUN npx --yes create-expo-app@latest . --template tabs


# Set environment variables for port consistency and enable tunnel by default
ENV PORT=8081
ENV EXPO_WEB_PORT=8081
ENV EXPO_NO_INTERACTIVE=1

# Set the subdomain for the Expo tunnel and ensure w
ENV EXPO_TUNNEL_SUBDOMAIN=expo-web-app-80828384

# Move the Expo app contents to the home directory
RUN mv /home/user/expo-app/* /home/user/ && mv /home/user/expo-app/.[^.]* /home/user/ 2>/dev/null || true && rm -rf /home/user/expo-app
