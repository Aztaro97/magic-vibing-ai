# Test Dockerfile to verify patch-package works
FROM node:20-bookworm

# Install system dependencies including ngrok
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Bun and make it available system-wide
RUN curl -fsSL https://bun.sh/install | bash && \
    chmod 755 /root && \
    chmod -R 755 /root/.bun && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Install ngrok
RUN wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    && tar -xzf ngrok-v3-stable-linux-amd64.tgz \
    && mv ngrok /usr/local/bin/ \
    && rm ngrok-v3-stable-linux-amd64.tgz

# Configure ngrok with auth token (set via build arg or environment variable)
ARG NGROK_AUTHTOKEN
RUN if [ -n "$NGROK_AUTHTOKEN" ]; then ngrok config add-authtoken "$NGROK_AUTHTOKEN"; fi

WORKDIR /app

# Copy only package files first
COPY package.json bun.lock* ./

# Copy patches directory BEFORE bun install so patch-package can use them
COPY patches/ ./patches/

# Install dependencies (this will run postinstall -> patch-package)
RUN bun install

# Copy source files
COPY . .

# Verify the patch was applied
RUN echo "=== Checking if patch was applied ===" && \
    grep -q "ngrokurl" node_modules/@expo/cli/build/bin/cli && \
    echo "✅ Patch successfully applied!" || \
    (echo "❌ Patch NOT applied!" && exit 1)

# Default command to test
CMD ["bun", "run", "start", "--", "--help"]
