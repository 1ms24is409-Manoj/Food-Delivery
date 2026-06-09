FROM node:18

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

COPY backend .

EXPOSE 4000

CMD ["npm", "start"]