# Use the base image with Node.js 8.11.3
FROM node:8.16

# Copy the current directory into the Docker image
RUN apt-get install -y curl
COPY . /submission-processor
# Set working directory for future use
WORKDIR /submission-processor

# Install the dependencies from package.json
RUN npm install
CMD npm start
