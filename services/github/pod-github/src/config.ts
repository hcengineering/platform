//
// Copyright © 2023 Hardcore Engineering Inc.
//

interface Config {
  AccountsURL: string
  ServiceID: string
  ServerSecret: string
  FrontURL: string

  // '*' means all workspaces
  AllowedWorkspaces: string[]
  AppID: string
  ClientID: string
  ClientSecret: string
  PrivateKey: string
  WebhookSecret: string
  EnterpriseHostname: string
  Port: number

  MongoURL: string
  ConfigurationDB: string

  CollaboratorURL: string

  BotName: string

  SentryDSN: string
  BrandingPath: string

  WorkspaceInactivityInterval: number // Interval in days to stop workspace synchronization if not visited

  // Limits
  RateLimit: number
}

const envMap: { [key in keyof Config]: string } = {
  AccountsURL: 'ACCOUNTS_URL',
  ServiceID: 'SERVICE_ID',
  ServerSecret: 'SERVER_SECRET',
  FrontURL: 'FRONT_URL',

  AppID: 'APP_ID',
  ClientID: 'CLIENT_ID',
  ClientSecret: 'CLIENT_SECRET',
  PrivateKey: 'PRIVATE_KEY',
  WebhookSecret: 'WEBHOOK_SECRET',
  EnterpriseHostname: 'ENTERPRISE_HOSTNAME',
  Port: 'PORT',
  AllowedWorkspaces: 'ALLOWED_WORKSPACES',
  BotName: 'BOT_NAME',

  MongoURL: 'MONGO_URL',
  ConfigurationDB: 'MONGO_DB',

  CollaboratorURL: 'COLLABORATOR_URL',

  SentryDSN: 'SENTRY_DSN',
  BrandingPath: 'BRANDING_PATH',

  WorkspaceInactivityInterval: 'WORKSPACE_INACTIVITY_INTERVAL',

  // Limits

  RateLimit: 'RATE_LIMIT' // Operations per second for one transactor
}

const required: Array<keyof Config> = [
  'AccountsURL',
  'ServerSecret',
  'ServiceID',
  'FrontURL',
  'AppID',
  'ClientID',
  'ClientSecret',
  'PrivateKey',

  'MongoURL',
  'ConfigurationDB',

  'CollaboratorURL',

  'BotName'
]

const config: Config = (() => {
  const params: Partial<Config> = {
    AccountsURL: process.env[envMap.AccountsURL],
    ServerSecret: process.env[envMap.ServerSecret],
    ServiceID: process.env[envMap.ServiceID] ?? 'github-service',
    AllowedWorkspaces: process.env[envMap.AllowedWorkspaces]?.split(',') ?? ['*'],
    FrontURL: process.env[envMap.FrontURL] ?? '',

    AppID: process.env[envMap.AppID],
    ClientID: process.env[envMap.ClientID],
    ClientSecret: process.env[envMap.ClientSecret],
    // https://github.com/octokit/auth-app.js/issues/465
    PrivateKey: process.env[envMap.PrivateKey]?.replace(/\\n/g, '\n'),
    WebhookSecret: process.env[envMap.WebhookSecret] ?? 'secret',
    EnterpriseHostname: process.env[envMap.EnterpriseHostname],
    Port: parseInt(process.env[envMap.Port] ?? '3500'),
    BotName: process.env[envMap.BotName] ?? 'ao-huly-dev[bot]',

    MongoURL: process.env[envMap.MongoURL],
    ConfigurationDB: process.env[envMap.ConfigurationDB] ?? '%github',

    CollaboratorURL: process.env[envMap.CollaboratorURL],

    SentryDSN: process.env[envMap.SentryDSN],
    BrandingPath: process.env[envMap.BrandingPath] ?? '',
    WorkspaceInactivityInterval: parseInt(process.env[envMap.WorkspaceInactivityInterval] ?? '5'), // In days
    RateLimit: parseInt(process.env[envMap.RateLimit] ?? '25')
  }

  const missingEnv = required.filter((key) => params[key] === undefined).map((key) => envMap[key])

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
