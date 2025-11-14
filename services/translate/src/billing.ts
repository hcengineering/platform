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

import { AiTokensData, getClient as getBillingClient } from '@hcengineering/billing-client'
import { MeasureContext, systemAccountUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'

import config from './config'

export async function pushTokensData (ctx: MeasureContext, data: AiTokensData[]): Promise<void> {
  if (config.BillingUrl === '') return
  try {
    const token = generateToken(systemAccountUuid, undefined, { service: 'translate' })
    const billingClient = getBillingClient(config.BillingUrl, token)
    await billingClient.postAiTokensData(data)
  } catch (e) {
    ctx.error('Failed to push tokens data', { e })
  }
}
