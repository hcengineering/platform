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

import AWS from 'aws-sdk'
import config from './config'
import { Message, Receivers } from './types'

export class SES {
  private readonly client: AWS.SES

  constructor () {
    AWS.config.credentials = {
      accessKeyId: config.AccessKey,
      secretAccessKey: config.SecretKey
    }
    this.client = new AWS.SES({ region: config.Region })
  }

  async sendMessage (message: Message, receivers: Receivers, from?: string): Promise<void> {
    console.log('send email to', receivers.to)
    const params: AWS.SES.Types.SendEmailRequest = {
      Source: config.Source,
      Destination: {
        ToAddresses: receivers.to
      },
      Message: {
        Subject: {
          Data: message.subject
        },
        Body: {
          Text: {
            Data: message.text
          }
        }
      }
    }
    // if (from !== undefined) {
    //   params.Source = `${from} <` + config.Source + '>'
    // }
    if (receivers.cc !== undefined) {
      params.Destination.CcAddresses = receivers.cc
    }
    if (receivers.bcc !== undefined) {
      params.Destination.BccAddresses = receivers.bcc
    }
    if (message.html !== undefined) {
      params.Message.Body.Html = {
        Data: message.html
      }
    }
    await this.client.sendEmail(params).promise()
  }
}
