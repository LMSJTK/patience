# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps - install node_modules once and share them with the stages below.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------------------------------------------------------------------------
# dev - Vite dev server with HMR. Compose bind-mounts the source over /app, so
# the COPY below only matters when this image is run without a mount.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN chown node:node /app
USER node
EXPOSE 3000
# "dev" already binds 0.0.0.0:3000 (see package.json) so the port is reachable
# from outside the container.
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# build - produce the static bundle in /app/dist.
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# prod - serve the built bundle with nginx.
# ---------------------------------------------------------------------------
FROM nginx:alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
