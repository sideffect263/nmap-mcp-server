FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# Install nmap core plus NSE libraries and scripts
RUN apk add --no-cache nmap nmap-nselibs nmap-scripts

# Check for nse_main.lua in the standard location for nmap data files
# This command will fail the build if the file is not found,
# which should be visible in Smithery's deployment logs.
RUN if [ ! -f /usr/share/nmap/nse_main.lua ]; then \
    echo "ERROR: /usr/share/nmap/nse_main.lua NOT FOUND!"; \
    echo "Listing contents of /usr/share/nmap/ and /usr/share/nmap/scripts/ (if they exist):"; \
    ls -R /usr/share/nmap || echo "/usr/share/nmap does not exist or is empty"; \
    exit 1; \
    fi
ENV NMAPDIR /usr/share/nmap
# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Ensure public directory is available
RUN ls -la public/ || echo "Warning: public directory not found"

EXPOSE 5001

CMD [ "node", "server.js" ] 