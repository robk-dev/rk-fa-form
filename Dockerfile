# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/node:3.0-appservice
FROM mcr.microsoft.com/azure-functions/node:3.0 as development

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

WORKDIR /home/site/wwwroot
COPY . .

RUN npm ci && \
    npm run prod:build

FROM mcr.microsoft.com/azure-functions/node:3.0 as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY *.json ./
RUN npm ci --only=prod

COPY --from=development /home/site/wwwroot/bin .