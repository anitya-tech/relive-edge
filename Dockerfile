FROM mcr.microsoft.com/dotnet/sdk:6.0-alpine as dotnet-builder
RUN git clone -b dev https://github.com/Bililive/BililiveRecorder.git /src && \
  cd /src/BililiveRecorder.Cli && \
  dotnet build -o /output -c Release


FROM node:16-alpine as node-builder
COPY . /app
RUN cd /app && yarn install && yarn build


FROM registry.geektr.co/t/base/dotnet:node

ENV BL_REC_PATH=/BililiveRecorder/BililiveRecorder.Cli \
  BL_REC_API_HOST=0.0.0.0 \
  BL_REC_API_PORT=1453 \
  RELIVE_EDGE_WORKDIR=/rec

WORKDIR /relive-edge/

COPY --from=dotnet-builder /output /BililiveRecorder
COPY --from=node-builder /app/package.json /app/yarn.lock /relive-edge/
RUN yarn --no-bin-links --prod --silent install
COPY --from=node-builder /app/ /relive-edge/

RUN npm install -g .

VOLUME ["/rec"]

CMD [ "relive-edge" ]
