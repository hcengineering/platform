//
// Copyright © 2023 Hardcore Engineering Inc.
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
import {
  SESClient,
  SendEmailCommand,
  type Body,
  type Destination,
  type SendEmailCommandInput,
  type Message as SesMessage
} from '@aws-sdk/client-ses'
import config from './config'
import { Message, Receivers } from './types'

export class SES {
  private readonly client: SESClient

  constructor () {
    this.client = new SESClient({
      region: config.Region,
      credentials: {
        accessKeyId: config.AccessKey,
        secretAccessKey: config.SecretKey
      }
    })
  }

  async sendMessage (message: Message, receivers: Receivers, from?: string): Promise<void> {
    console.log('send email to', receivers.to)
    const destionation: Destination = {
      ToAddresses: receivers.to
    }
    const body: Body = {
      Text: {
        Data: message.text
      }
    }
    const sesMessage: SesMessage = {
      Subject: {
        Data: message.subject
      },
      Body: body
    }
    const params: SendEmailCommandInput = {
      Source: config.Source,
      Destination: destionation,
      Message: sesMessage
    }
    // if (from !== undefined) {
    //   params.Source = `${from} <` + config.Source + '>'
    // }
    if (receivers.cc !== undefined) {
      destionation.CcAddresses = receivers.cc
    }
    if (receivers.bcc !== undefined) {
      destionation.BccAddresses = receivers.bcc
    }
    if (message.html !== undefined) {
      body.Html = {
        Data: message.html
      }
    }
    await this.client.send(new SendEmailCommand(params))
  }
}
