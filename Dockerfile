FROM node:22-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build:only

# Expose the API port
EXPOSE 3000

# Make entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Use entrypoint script, default to server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["server"]
