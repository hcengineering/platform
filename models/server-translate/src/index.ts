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

import { Builder, Model, Prop, TypeString, UX } from '@hcengineering/model'
import { TConfiguration } from '@hcengineering/model-core'
import { getEmbeddedLabel } from '@hcengineering/platform'

import core, { DOMAIN_CONFIGURATION } from '@hcengineering/core'
import translate, { TranslateConfiguration } from '@hcengineering/translate/src/plugin'

export { translateId } from '@hcengineering/translate/src/plugin'

@Model(translate.class.TranslateConfiguration, core.class.Configuration, DOMAIN_CONFIGURATION)
@UX(getEmbeddedLabel('Retranslation'))
export class TTranslateConfiguration extends TConfiguration implements TranslateConfiguration {
  @Prop(TypeString(), getEmbeddedLabel('Token'))
    token!: string

  @Prop(TypeString(), getEmbeddedLabel('Token'))
    endpoint!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TTranslateConfiguration)
}
