# Use the base image with Node.js 16.20.1-buster
FROM node:16.20.1-buster

# Copy the current directory into the Docker image
COPY . /submission-processor
# Set working directory for future use
WORKDIR /submission-processor

# Install the dependencies from package.json
RUN yarn install
CMD node src/app.js
