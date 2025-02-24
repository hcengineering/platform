# Github App guidelines

https://github.com/github/github-app-js-sample/tree/main

## Developer resources

### Forward github events to platform

```typescript
  smee -u https://smee.io/Oj0ZkULovroxbFC6 -t http://localhost:3500/api/webhook
```

### Shared application should be linked via `https://github.com/apps/<app name>/installations/new?state=AB12t`

https://docs.github.com/en/apps/sharing-github-apps/sharing-your-github-app

## Instructions to setup GitHub integration for local testing

### Register a new GitHub App

Go to _Settings/Developer settings/GitHub Apps_

* Name: Any unique name. E.g. _XX_huly_dev_. Referred as _GITHUB_APP_ later in the document.
* Homepage URL: http://localhost:8080
* Callback URL: http://localhost:8080/github
* Setup URL (optional): http://localhost:8080/github?op=installation
* Redirect on update: Checked

#### New webhook

Go to https://smee.io/ and click _Start a new channel_

* Use the provided Webhook Proxy URL as Webhook URL. Referred as _WEBHOOK_URL_ later in the document.
* Webhook secret is: `secret`
* Keep Webhook Active checked.

#### Configure permissions for the app:

* Commit statuses: _Read and write_
* Contents: _Read and write_
* Custom properties: _Read and write_
* Discussions: _Read and write_
* Issues: _Read and write_
* Metadata: _Read-only_
* Pages: _Read and write_
* Projects: _Read and write_
* Pull requests: _Read and write_
* Webhooks: _Read and write_

#### Subscribe to events:

* Issues
* Pull request
* Pull request review
* Pull request review comment
* Pull request review thread

#### Final creation steps

* Create the app.
* Generate a new client secret. Referred as _POD_GITHUB_CLIENT_SECRET_ later in the document.
* Create and download you private key file as well. Referred as _POD_GITHUB_PRIVATE_KEY_ later in the document.
* You'll be provided with your GitHub app ID. Referred as _POD_GITHUB_APPID_ later in the document.

#### Forward webhook events to local server

* Install smee client:

```
npm install --global smee-client
```

* To forward events (keep it up and running):

```
smee -u {WEBHOOK_URL} -t http://localhost:3500/api/webhook
```
#### Update local config files

##### .vscode/launch.json —> Debug Github integration

* "APP_ID": "{POD_GITHUB_APPID}"  <— Numeric ID of the new application
* "CLIENT_ID": "{POD_GITHUB_CLIENTID}" <—- Client ID from the new application
* "CLIENT_SECRET": "{POD_GITHUB_CLIENT_SECRET}" <—- Client Secret from the new application
* "PRIVATE_KEY": "{POD_GITHUB_PRIVATE_KEY}" <—- PK from the new application

_Note: PK value format: "-----BEGIN RSA PRIVATE KEY-----\n {ACTUAL_KEY_WO_LINE_BREAKS}\n-----END RSA PRIVATE KEY-----_

##### dev/prod/public/config.json

* "GITHUB_APP": “{GITHUB_APP}" <— Textual name of the new application
* "GITHUB_CLIENTID": “{POD_GITHUB_CLIENTID}” <— Client ID from the new application

#### Usage

* Run dev GitHub pod (Debug Github integration) in vscode
* Run dev server
* On localhost:8080 Go to Settings -> Integrations -> Github
    * On the first tab authorise your GitHub
    * On the second tab of the dialog install the application, select a GH repo and connect to an existing/create a new connected repo in the tracker.
* Enjoy!
