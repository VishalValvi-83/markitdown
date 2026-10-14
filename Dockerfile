FROM node:20-slim AS frontend-build

WORKDIR /app/web-app/frontend
COPY web-app/frontend/package*.json ./
RUN npm ci
COPY web-app/frontend/ ./
RUN npm run build

FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV EXIFTOOL_PATH=/usr/bin/exiftool
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV ORT_DISABLE_TELEMETRY=1

# Runtime dependency
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    libimage-exiftool-perl

ARG INSTALL_GIT=false
RUN if [ "$INSTALL_GIT" = "true" ]; then \
    apt-get install -y --no-install-recommends \
    git; \
    fi

# Cleanup
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app
RUN pip3 --no-cache-dir install --break-system-packages \
    /app/packages/markitdown[all] \
    /app/packages/markitdown-sample-plugin
RUN npm ci --omit=dev --prefix /app/web-app
COPY --from=frontend-build /app/web-app/frontend/dist /app/web-app/public

# Default USERID and GROUPID
ARG USERID=nobody
ARG GROUPID=nogroup

USER $USERID:$GROUPID

WORKDIR /app/web-app
ENTRYPOINT ["node", "server.js"]
