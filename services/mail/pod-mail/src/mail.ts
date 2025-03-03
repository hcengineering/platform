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
import { type SendMailOptions, type Transporter } from 'nodemailer'

import config from './config'
import { Message, Receivers } from './types'
import { getDefaultTransport } from './transport'

export class MailClient {
  private readonly transporter: Transporter

  constructor () {
    this.transporter = getDefaultTransport(config)
  }

  async sendMessage (message: Message, receivers: Receivers, from?: string): Promise<void> {
    console.log('send email to', receivers.to)
    console.log('from', from)
    const mailOptions: SendMailOptions = {
      from,
      to: receivers.to,
      text: message.text,
      subject: message.subject
    }
    if (receivers.cc !== undefined) {
      mailOptions.cc = receivers.cc
    }
    if (receivers.bcc !== undefined) {
      mailOptions.bcc = receivers.bcc
    }
    if (message.html !== undefined) {
      mailOptions.html = message.html
    }

    const result = await this.transporter.sendMail(mailOptions)
    console.log('Mail has been sent')
    console.log(result)
  }
}
