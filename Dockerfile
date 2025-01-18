FROM node:23-alpine3.20

COPY package.json /app/
COPY package-lock.json /app/
COPY index.js /app/
COPY .gitignore /app/
COPY routes /app/
COPY models /app/
COPY middleware /app/
COPY config /app/

WORKDIR /app

RUN npm install

CMD ["node", "index.js"]
