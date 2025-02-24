interface Config {
  Host: string | undefined
  Port: number

  TelegramApiID: number
  TelegramApiHash: string
  TelegramAuthTTL: number

  MongoURI: string
  MongoDB: string

  AccountsURL: string
  ServiceID: string
  Secret: string
}

const envMap: { [key in keyof Config]: string } = {
  Host: 'HOST',
  Port: 'PORT',

  TelegramApiID: 'TELEGRAM_API_ID',
  TelegramApiHash: 'TELEGRAM_API_HASH',
  TelegramAuthTTL: 'TELEGRAM_AUTH_TTL',

  MongoURI: 'MONGO_URI',
  MongoDB: 'MONGO_DB',

  AccountsURL: 'ACCOUNTS_URL',
  ServiceID: 'SERVICE_ID',
  Secret: 'SECRET'
}

const defaults: Partial<Config> = {
  Host: undefined,
  Port: 8086,

  TelegramApiID: undefined,
  TelegramApiHash: undefined,
  TelegramAuthTTL: 600 * 1000,

  MongoURI: undefined,
  MongoDB: 'telegram-service',

  AccountsURL: undefined,
  ServiceID: 'telegram-service',

  Secret: undefined
}

const required: Array<keyof Config> = ['TelegramApiID', 'TelegramApiHash', 'MongoURI', 'AccountsURL', 'Secret']

const mergeConfigs = <T>(defaults: Partial<T>, params: Partial<T>): T => {
  const result = { ...defaults }
  for (const key in params) {
    if (params[key] !== undefined) {
      result[key] = params[key]
    }
  }
  return result as T
}

const parseNumber = (str: string | undefined): number | undefined => (str != null ? Number(str) : undefined)

const config = (() => {
  const ttl = parseNumber(process.env[envMap.TelegramAuthTTL])
  const params: Partial<Config> = {
    Host: process.env[envMap.Host],
    Port: parseNumber(process.env[envMap.Port]),
    TelegramApiID: parseNumber(process.env[envMap.TelegramApiID]),
    TelegramApiHash: process.env[envMap.TelegramApiHash],
    TelegramAuthTTL: ttl === undefined ? ttl : ttl * 1000,
    MongoDB: process.env[envMap.MongoDB],
    MongoURI: process.env[envMap.MongoURI],
    AccountsURL: process.env[envMap.AccountsURL],
    ServiceID: process.env[envMap.ServiceID],
    Secret: process.env[envMap.Secret]
  }

  const missingEnv = required.filter((key) => params[key] === undefined).map((key) => envMap[key])

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  const res = mergeConfigs<Config>(defaults, params)
  return res
})()

export default config
