FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# node:24-alpine의 기본 npm(11.19.x)은 optional dependency 그래프 검증이 더 엄격해
# 이 lockfile의 심층 optional 항목(예: next의 optional sharp -> wasm32 fallback ->
# @emnapi/runtime 체인)을 npm ci 단계에서 누락으로 오판하고 실패한다. 로컬 개발에서
# 검증된 npm 11.6.2로 고정해 동일한 lockfile로 결정적으로 설치한다.
RUN npm install -g npm@11.6.2
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]
