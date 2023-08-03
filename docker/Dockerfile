# Use the base image with Node.js 18.16.1
FROM node:18.16.1
# Copy the current directory into the Docker image
COPY . /submission-processor
# Set working directory for future use
WORKDIR /submission-processor

# Install the dependencies from package.json
RUN yarn install
CMD node src/app.js
