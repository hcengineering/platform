import { concatLink, MeasureContext } from '@hcengineering/core'

import config from './config'
import { MailMessage } from './types'

export async function sendEmail (ctx: MeasureContext, message: MailMessage, secret: string): Promise<void> {
  const mailURL = config.mailUrl
  if (mailURL === undefined || mailURL === '') {
    ctx.error('Please provide email service url to enable email sending')
    return
  }
  const mailAuth = config.mailAuth

  const response = await fetch(concatLink(mailURL, '/send'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(mailAuth != null ? { Authorization: `Bearer ${mailAuth}` } : {})
    },
    body: JSON.stringify({
      ...message,
      password: secret,
      apiKey: mailAuth
    })
  })
  if (!response.ok) {
    const responseBody = await response.text()
    ctx.error(`Failed to send email: ${response.status} ${response.statusText}. Response body: ${responseBody}`, {
      to: message.to,
      from: message.from
    })
  }
}
