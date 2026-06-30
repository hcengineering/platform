FROM node:20.11.0-slim
WORKDIR /usr/src/app

# Install dependencies (ts-node is used at runtime; Huly packages ship no .d.ts,
# so we transpile-only rather than type-check-compile).
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# App sources
COPY tsconfig.json ./
COPY src ./src

EXPOSE 4025
# Config is supplied via environment variables at runtime (see DEPLOY.md).
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
