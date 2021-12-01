FROM node:17-alpine3.12

WORKDIR /app

RUN apk --no-cache add python3 gcc make

COPY src/ /app/src
COPY package.json /app/package.json
COPY tsconfig.json /app/tsconfig.json

RUN yarn

# RUN yarn cache clean
# RUN yarn install --production
RUN mkdir -p /app/workflows


CMD [ "node_modules/.bin/ts-node", "/app/src/index.ts" ]
