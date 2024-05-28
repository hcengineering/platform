export interface ServerEnv {
  url: string
  elasticUrl: string
  serverSecret: string
  rekoniUrl: string
  frontUrl: string
  uploadUrl: string
  sesUrl: string | undefined
  accountsUrl: string
  collaboratorUrl: string
  serverPort: number
  enableCompression: boolean
  elasticIndexName: string
  pushPublicKey: string | undefined
  pushPrivateKey: string | undefined
  pushSubject: string | undefined
}

export function serverConfigFromEnv (): ServerEnv {
  const serverPort = parseInt(process.env.SERVER_PORT ?? '3333')
  const enableCompression = (process.env.ENABLE_COMPRESSION ?? 'true') === 'true'

  const url = process.env.MONGO_URL
  if (url === undefined) {
    console.error('please provide mongodb url')
    process.exit(1)
  }

  const elasticUrl = process.env.ELASTIC_URL
  if (elasticUrl === undefined) {
    console.error('please provide elastic url')
    process.exit(1)
  }
  const elasticIndexName = process.env.ELASTIC_INDEX_NAME
  if (elasticIndexName === undefined) {
    console.log('Please provide ELASTIC_INDEX_NAME')
    process.exit(1)
  }

  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.log('Please provide server secret')
    process.exit(1)
  }

  const rekoniUrl = process.env.REKONI_URL
  if (rekoniUrl === undefined) {
    console.log('Please provide REKONI_URL url')
    process.exit(1)
  }

  const frontUrl = process.env.FRONT_URL
  if (frontUrl === undefined) {
    console.log('Please provide FRONT_URL url')
    process.exit(1)
  }

  const uploadUrl = process.env.UPLOAD_URL
  if (uploadUrl === undefined) {
    console.log('Please provide UPLOAD_URL url')
    process.exit(1)
  }

  const sesUrl = process.env.SES_URL

  const accountsUrl = process.env.ACCOUNTS_URL
  if (accountsUrl === undefined) {
    console.log('Please provide ACCOUNTS_URL url')
    process.exit(1)
  }

  const collaboratorUrl = process.env.COLLABORATOR_URL
  if (collaboratorUrl === undefined) {
    console.error('please provide collaborator url')
    process.exit(1)
  }

  const pushPublicKey = process.env.PUSH_PUBLIC_KEY
  const pushPrivateKey = process.env.PUSH_PRIVATE_KEY
  const pushSubject = process.env.PUSH_SUBJECT
  return {
    url,
    elasticUrl,
    elasticIndexName,
    serverSecret,
    rekoniUrl,
    frontUrl,
    uploadUrl,
    sesUrl,
    accountsUrl,
    collaboratorUrl,
    serverPort,
    enableCompression,
    pushPublicKey,
    pushPrivateKey,
    pushSubject
  }
}
