//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import nodemailer, { type Transporter } from 'nodemailer'
import * as aws from '@aws-sdk/client-ses'

import { type Config, type SmtpConfig, type SesConfig, getTlsSettings } from './config'

function smtp (config: SmtpConfig): Transporter {
  console.log('Using SMTP config')
  const auth =
    config.Username !== undefined && config.Password !== undefined
      ? {
          user: config.Username,
          pass: config.Password
        }
      : undefined
  const tlsSettings = getTlsSettings(config)
  return nodemailer.createTransport({
    host: config.Host,
    port: config.Port,
    auth,
    logger: true,
    debug: config.DebugLog,
    ...tlsSettings
  })
}

function ses (config: SesConfig): Transporter {
  console.log('Using AWS SES config')
  const ses = new aws.SES({
    region: config.Region,
    credentials: {
      accessKeyId: config.AccessKey,
      secretAccessKey: config.SecretKey
    }
  })

  return nodemailer.createTransport({
    SES: { ses, aws }
  })
}

export function getDefaultTransport (config: Config): Transporter {
  if (config.smtpConfig !== undefined) {
    return smtp(config.smtpConfig)
  }
  if (config.sesConfig !== undefined) {
    return ses(config.sesConfig)
  }
  throw new Error('No transport protocol is configured')
}

export function getSmtpTransport (config: SmtpConfig, user: string, pass: string): Transporter {
  const auth = { user, pass }
  const tlsSettings = getTlsSettings(config)
  return nodemailer.createTransport({
    host: config.Host,
    port: config.Port,
    auth,
    logger: true,
    debug: config.DebugLog,
    ...tlsSettings
  })
}
