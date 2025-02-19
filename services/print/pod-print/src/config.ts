//
// Copyright © 2024 Hardcore Engineering Inc.
//

export interface Config {
  Port: number
  Secret: string
  AllowedHostnames: string[]
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const allowedHostnames = process.env.ALLOWED_HOSTNAMES

  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4005,
    Secret: process.env.SECRET,
    AllowedHostnames: allowedHostnames == null ? [] : allowedHostnames.split(',')
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
