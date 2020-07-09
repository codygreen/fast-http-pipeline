FROM node as http_pipeline_depdendencies
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

FROM http_pipeline_depdendencies as http_default_pipelines
ENV F5_FAST_PIPELINE_ROOT /var/config/pipelines/
COPY ./pipelines/* /var/config/pipelines/

FROM http_default_pipelines as http_pipeline
COPY lib/ lib/
COPY index.js ./
COPY server.js ./
CMD npm start
