FROM apify/actor-node-playwright:20

# Install any extra NPM deps
COPY package*.json ./
RUN npm install

# Copy actor code
COPY . ./

CMD ["npm", "start"]
