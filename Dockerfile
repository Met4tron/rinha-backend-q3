FROM node:20.5.1-buster as base

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci

COPY . .

RUN npm run build


FROM gcr.io/distroless/nodejs20-debian11

WORKDIR /usr/src/app

COPY --from=base /usr/src/app/dist .
COPY --from=base /usr/src/app/node_modules ./node_modules

CMD ["handler.js"]