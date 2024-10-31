export interface ServerEnv {
  dbUrl: string
  mongoUrl?: string
  fulltextUrl: string
  serverSecret: string
  frontUrl: string
  filesUrl: string | undefined
  sesUrl: string | undefined
  accountsUrl: string
  serverPort: number
  enableCompression: boolean
  pushPublicKey: string | undefined
  pushPrivateKey: string | undefined
  pushSubject: string | undefined
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
  const sesUrl = process.env.SES_URL

  const accountsUrl = process.env.ACCOUNTS_URL
  if (accountsUrl === undefined) {
    console.log('Please provide ACCOUNTS_URL url')
    process.exit(1)
  }

  const pushPublicKey = process.env.PUSH_PUBLIC_KEY
  const pushPrivateKey = process.env.PUSH_PRIVATE_KEY
  const pushSubject = process.env.PUSH_SUBJECT
  const brandingPath = process.env.BRANDING_PATH

  return {
    dbUrl,
    mongoUrl,
    fulltextUrl,
    serverSecret,
    frontUrl,
    filesUrl,
    sesUrl,
    accountsUrl,
    serverPort,
    enableCompression,
    pushPublicKey,
    pushPrivateKey,
    pushSubject,
    brandingPath
  }
}
