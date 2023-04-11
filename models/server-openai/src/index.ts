//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Builder, Model, Prop, TypeBoolean, TypeNumber, TypeString, UX } from '@hcengineering/model'
import { TConfiguration } from '@hcengineering/model-core'
import { getEmbeddedLabel } from '@hcengineering/platform'

import core, { DOMAIN_CONFIGURATION } from '@hcengineering/core'
import openai, { OpenAIConfiguration } from '@hcengineering/openai/src/plugin'
import serverCore from '@hcengineering/server-core'

import chunter from '@hcengineering/model-chunter'
import recruit from '@hcengineering/model-recruit'

export { openAIId } from '@hcengineering/openai/src/plugin'

@Model(openai.class.OpenAIConfiguration, core.class.Configuration, DOMAIN_CONFIGURATION)
@UX(getEmbeddedLabel('OpenAI'))
export class TOpenAIConfiguration extends TConfiguration implements OpenAIConfiguration {
  @Prop(TypeString(), getEmbeddedLabel('Token'))
    token!: string

  @Prop(TypeString(), getEmbeddedLabel('Endpoint'))
    endpoint!: string

  @Prop(TypeNumber(), getEmbeddedLabel('Token Limit'))
    tokenLimit!: number

  @Prop(TypeBoolean(), getEmbeddedLabel('Use embeddings'))
    embeddings!: boolean
}

export function createModel (builder: Builder): void {
  builder.createModel(TOpenAIConfiguration)

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: openai.trigger.AsyncOnGPTRequest,
    txMatch: {
      objectClass: { $in: [chunter.class.Comment, recruit.class.ApplicantMatch] },
      _class: core.class.TxCreateDoc
    }
  })
}
