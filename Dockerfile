FROM node:22-alpine

WORKDIR /app

# copia do package.json
COPY package.json package-lock.json ./

# instala o node_modules
RUN npm ci --only=production

#copia do codigo
COPY . .

#comando que vai ser executado

CMD ["node", "index.js"]