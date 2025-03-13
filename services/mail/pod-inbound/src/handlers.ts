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
import { Request, Response } from 'express'
import { MailInfo } from './types'

export async function createMessage (req: Request, res: Response): Promise<void> {
  try {
    const { from, to, subject, text, html } = req.body
    if (from === undefined) {
      res.status(400).send({ error: 'Missing from address' })
      return
    }
    if (to === undefined) {
      res.status(400).send({ error: 'Missing to address' })
      return
    }
    const mail: MailInfo = {
      from,
      to,
      subject,
      text,
      html
    }

    console.log(`Creating message ${mail.from}`)
    res.send()
  } catch (err: any) {
    console.error('Failed to create mail message:', err.message)
  }
}
