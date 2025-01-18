# Use Node.js image
FROM node:23-alpine3.20

# Set the working directory
WORKDIR /app

# Copy all files into the container
COPY . .

# Install dependencies
RUN npm install

# Default command to run the application
CMD ["node", "index.js"]





































# FROM node:23-alpine3.20

# COPY package.json /app/
# COPY package-lock.json /app/
# COPY index.js /app/
# COPY .gitignore /app/
# COPY routes /app/
# COPY models /app/
# COPY middleware /app/
# COPY config /app/

# WORKDIR /app

# RUN npm install

# CMD ["node", "index.js"]
