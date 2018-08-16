# Use the base image with Node.js 8.11.3
FROM node:8.11.3

# Copy the current directory into the Docker image

RUN ls -la
WORKDIR /opt/app/
COPY .. .
# Set working directory for future use


# Install the dependencies from package.json
RUN npm install
