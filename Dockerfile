FROM docker:18

RUN apk add --no-cache nodejs nodejs-npm

RUN npm install -g rekcod

ENTRYPOINT ["rekcod"]
