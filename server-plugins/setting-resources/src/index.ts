//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Doc } from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import setting, { Integration } from '@hcengineering/setting'

/**
 * @public
 */
export async function integrationHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const integration = doc as Integration
  const type = (await control.modelDb.findAll(setting.class.IntegrationType, { _id: integration.type }))[0]
  if (type === undefined) return ''
  return await translate(type.label, {})
}

/**
 * @public
 */
export async function integrationTextPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const integration = doc as Integration
  const type = (await control.modelDb.findAll(setting.class.IntegrationType, { _id: integration.type }))[0]
  if (type === undefined) return ''
  return await translate(type.label, {})
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    IntegrationHTMLPresenter: integrationHTMLPresenter,
    IntegrationTextPresenter: integrationTextPresenter
  }
})
