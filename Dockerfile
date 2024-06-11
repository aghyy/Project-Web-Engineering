FROM node:latest

WORKDIR /Users/andreas/projects/dhbw-projects/webengineering/DHBW-Calendar

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 6059

CMD ["npm", "run", "dev"]