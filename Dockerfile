FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
RUN apk add --no-cache nmap
RUN find /usr -name nse_main.lua -o -name scripts -type d
ENV NMAPDIR /usr/share/nmap
# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY . .

EXPOSE 5001

CMD [ "node", "server.js" ] 