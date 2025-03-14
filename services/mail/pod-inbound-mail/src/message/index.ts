//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { getClient as getAccountClient } from '@hcengineering/account-client'

import { type EmailMessage } from './types'
import { createMessage } from './messages'
import { restClient } from './client'
import { ensurePerson } from './persons'

export default {
  async email(message: EmailMessage, env: Env, ctx: object): Promise<void> {
    const startTime = Date.now()
    try {
      // parse email content
      const rawEmail = new Response(message.raw)

      const token = await env.AUTH.token({ workspace: env.WORKSPACE_ID, service: 'mail' })
      const client = await restClient(env, token)
      const accountClient = getAccountClient(env.ACCOUNTS_URL, token)

      await ensurePerson(accountClient, email)
      await createMessage(env, client, email)
    } catch (err) {
      console.error(err)
    } finally {
      console.log(`Finished email processing(from: ${message.from}, execution time:${Date.now() - startTime})`)
    }
  }
}
