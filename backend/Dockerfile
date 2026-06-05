FROM node:20-slim

# Prisma требует openssl
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ставим зависимости (нужны и dev — там tsx и prisma)
COPY package*.json ./
RUN npm ci

# Копируем весь код
COPY . .

# Генерируем Prisma Client (он в gitignore, поэтому генерим тут)
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start"]