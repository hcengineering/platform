# Overview

Front service is suited to deliver application bundles and resource assets, it also work as resize/recode service for previews, perform blob storage front operations.

## Configuration

* SERVER_PORT: Specifies the port number on which the server will listen.
* MONGO_URL: Specifies the URL of the MongoDB database.
* ELASTIC_URL: Specifies the URL of the Elasticsearch service.
* ACCOUNTS_URL: Specifies the URL of the accounts service.
* UPLOAD_URL: Specifies the URL for uploading files.
* GMAIL_URL: Specifies the URL of the Gmail service.
* CALENDAR_URL: Specifies the URL of the calendar service.
* TELEGRAM_URL: Specifies the URL of the Telegram service.
* REKONI_URL: Specifies the URL of the Rekoni service.
* COLLABORATOR_URL: Specifies the URL of the collaborator service.
* MODEL_VERSION: Specifies the required model version.
* SERVER_SECRET: Specifies the server secret.
* PREVIEW_CONFIG: Specifies the preview configuration.
* BRANDING_URL: Specifies the URL of the branding service.

## Preview service configuration

PREVIEW_CONFIG env variable format.

A `;` separated list of pairs, mediaType|previewUrl.

* mediaType - a type of media, image or video.
* previewUrl - an Url with :workspace, :blobId, :downloadFile, :size placeholders, they will be replaced in UI with an appropriate blob values.

PREVIEW_CONFIG=image|https://front.hc.engineering/files/:workspace/api/preview/?width=:size&image=:downloadFile

## Variables

- :workspace - a current workspacw public url name segment. 
- :blobId - an uniq blob _id identifier.
- :size - a numeric value to determine required size of the image, image will not be upscaled, only downscaled. If -1 is passed, original image size value will be used.
- :downloadFile - an URI encoded component value of full download URI, could be presigned uri to S3 storage.

## Passing default variant.

providerName could be set to `*` in this case it will be default preview provider.

## Default variant.

If no preview config are specified, a default one targating a front service preview/resize functionality will be used.

`/files/${getCurrentWorkspaceUrl()}?file=:blobId&size=:size`

## Testing with dev-production/etc.

Only a downloadFile variant of URIs will work, since app is hosted on localhost and token should be valid to use preview on production environment.
