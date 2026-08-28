//
// Copyright © 2024 Hardcore Engineering Inc.
//

import { config as dotenvConfig } from 'dotenv'

dotenvConfig()

export interface Config {
  Port: number
  Secret: string
  AccountsUrl: string
  FrontUrl: string
  AllowedHostnames: string[]
  PuppeteerArgs: string[]
  PrintConcurrency: number
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const parsePositiveInteger = (str: string | undefined, defaultValue: number): number => {
  const value = parseNumber(str) ?? defaultValue
  if (!Number.isInteger(value) || value <= 0) {
    throw Error(`Invalid positive integer config value: ${str}`)
  }
  return value
}

const config: Config = (() => {
  const allowedHostnames = process.env.ALLOWED_HOSTNAMES
  const puppeteerArgs = process.env.PUPPETEER_ARGS ?? ''

  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4005,
    Secret: process.env.SECRET,
    AccountsUrl: process.env.ACCOUNTS_URL,
    FrontUrl: process.env.FRONT_URL,
    AllowedHostnames: allowedHostnames == null ? [] : allowedHostnames.split(','),
    PuppeteerArgs: puppeteerArgs.split(','),
    PrintConcurrency: parsePositiveInteger(process.env.PRINT_CONCURRENCY, 1)
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
