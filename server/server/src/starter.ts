export interface ServerEnv {
  dbUrl: string
  mongoUrl?: string
  fulltextUrl: string
  serverSecret: string
  frontUrl: string
  filesUrl: string | undefined
  mailUrl: string | undefined
  mailAuthToken: string | undefined
  webPushUrl: string | undefined
  accountsUrl: string
  serverPort: number
  enableCompression: boolean
  brandingPath: string | undefined
}

export function serverConfigFromEnv (): ServerEnv {
  const serverPort = parseInt(process.env.SERVER_PORT ?? '3333')
  const enableCompression = (process.env.ENABLE_COMPRESSION ?? 'false') === 'true'

  const dbUrl = process.env.DB_URL
  if (dbUrl === undefined) {
    console.error('please provide DB_URL')
    process.exit(1)
  }

  const mongoUrl = process.env.MONGO_URL

  const fulltextUrl = process.env.FULLTEXT_URL
  if (fulltextUrl === undefined) {
    console.error('please provide Fulltext URL')
    process.exit(1)
  }

  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.log('Please provide server secret')
    process.exit(1)
  }

  const frontUrl = process.env.FRONT_URL
  if (frontUrl === undefined) {
    console.log('Please provide FRONT_URL url')
    process.exit(1)
  }

  const filesUrl = process.env.FILES_URL
  const mailUrl = process.env.MAIL_URL ?? process.env.SES_URL // SES_URL is used for backward compatibility
  const mailAuthToken = process.env.MAIL_AUTH_TOKEN ?? process.env.SES_AUTH_TOKEN
  const webPushUrl = process.env.WEB_PUSH_URL ?? process.env.SES_URL

  const accountsUrl = process.env.ACCOUNTS_URL
  if (accountsUrl === undefined) {
    console.log('Please provide ACCOUNTS_URL url')
    process.exit(1)
  }

  const brandingPath = process.env.BRANDING_PATH

  return {
    dbUrl,
    mongoUrl,
    fulltextUrl,
    serverSecret,
    frontUrl,
    filesUrl,
    mailUrl,
    mailAuthToken,
    webPushUrl,
    accountsUrl,
    serverPort,
    enableCompression,
    brandingPath
  }
}
