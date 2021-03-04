# Transpile typescript into javascript
FROM node:lts
RUN apt-get update || : && apt-get install python -y
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# create image for production
FROM node:lts
RUN apt-get update || : && apt-get install python -y
WORKDIR /crystal
COPY package*.json ./
RUN npm install --production
COPY --from=0 ./app/dist .
COPY ./src/libraries ./libraries
CMD npm start