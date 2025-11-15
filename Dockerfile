FROM apify/actor-node:20

# Install Playwright system dependencies
RUN npx playwright install-deps

# Install browsers (Chromium, Firefox, WebKit)
RUN npx playwright install --with-deps

COPY package*.json ./
RUN npm install
COPY . ./

CMD ["npm", "start"]
