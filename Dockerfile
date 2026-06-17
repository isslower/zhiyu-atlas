FROM node:20-alpine AS build

WORKDIR /app

COPY client/package*.json client/
RUN npm ci --prefix client

COPY client client
RUN npm run build --prefix client

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/docker-entrypoint.sh /docker-entrypoint.d/40-zhiyu-config.sh
COPY --from=build /app/client/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-zhiyu-config.sh

ENV AMAP_KEY=""
ENV AMAP_SECURITY_CODE=""

EXPOSE 80
