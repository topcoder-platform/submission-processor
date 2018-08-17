# Use the base image with Node.js 8.11.3
FROM node:8.11.3

# Copy the current directory into the Docker image
RUN apt-get install -y curl
COPY . /submissions-processor
# Set working directory for future use
WORKDIR /submissions-processor


# Install the dependencies from package.json
RUN npm install
