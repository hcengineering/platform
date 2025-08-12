import { concatLink, MeasureContext } from '@hcengineering/core'

import config from './config'
import { MailMessage } from './types'

export async function sendEmail (ctx: MeasureContext, message: MailMessage): Promise<void> {
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
      apiKey: mailAuth
    })
  })
  if (!response.ok) {
    ctx.error(`Failed to send email: ${response.statusText}`, { to: message.to, from: message.from })
  }
}
