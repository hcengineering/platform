interface Config {
  Port: number
  DbUrl: string
  AccountsUrl: string
  Secret: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 8090,
    DbUrl: process.env.DB_URL,
    AccountsUrl: process.env.ACCOUNTS_URL,
    Secret: process.env.SECRET
  }

  const missingEnv = Object.entries(params)
    .filter(([, value]) => value === undefined)
    .map(([key]) => key)

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
