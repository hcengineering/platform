//
// Copyright © 2024 Hardcore Engineering Inc.
//

import fs from 'fs'

export interface Config {
  AccountsUrl: string
  Cert: Buffer
  CertPwd: string
  Port: number
  Secret: string
  ServiceID: string
  SystemEmail: string
  BrandingPath: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    AccountsUrl: process.env.ACCOUNTS_URL,
    Cert: process.env.CERTIFICATE_PATH !== undefined ? fs.readFileSync(process.env.CERTIFICATE_PATH) : undefined,
    CertPwd: process.env.CERTIFICATE_PASSWORD ?? '',
    Port: parseNumber(process.env.PORT) ?? 4006,
    Secret: process.env.SECRET,
    ServiceID: process.env.SERVICE_ID,
    SystemEmail: process.env.SYSTEM_EMAIL ?? 'anticrm@hc.engineering',
    BrandingPath: process.env.BRANDING_PATH ?? ''
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
