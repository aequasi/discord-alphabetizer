# Use the official Node.js image as the base image
FROM node:18-alpine

RUN npm i -g pnpm

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN pnpm install --prefer-frozen-lockfile

# Copy the TypeScript configuration and source files to the working directory
COPY tsconfig.json ./
COPY src ./src

# Compile the TypeScript code to JavaScript
RUN pnpm run build

# Install the dependencies
RUN pnpm install --prefer-frozen-lockfile --prefer-offline --prod

# Copy the .env file containing the bot token to the working directory
COPY .env ./

# Expose the default port for the bot (optional, only needed if your bot uses a specific port for communication)
# EXPOSE 3000

# Start the bot
CMD ["node", "dist/index.js"]