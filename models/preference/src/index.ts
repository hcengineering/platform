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

import { Doc, Ref, Space } from '@hcengineering/core'
import { Builder, Model, Prop, TypeRef } from '@hcengineering/model'
import core, { TDoc } from '@hcengineering/model-core'
import preference, { DOMAIN_PREFERENCE, Preference, SpacePreference } from '@hcengineering/preference'

export { preferenceId } from '@hcengineering/preference'
export { preferenceOperation } from './migration'
export { preference as default }

@Model(preference.class.Preference, core.class.Doc, DOMAIN_PREFERENCE)
export class TPreference extends TDoc implements Preference {
  @Prop(TypeRef(core.class.Doc), core.string.AttachedTo)
    attachedTo!: Ref<Doc>
}

@Model(preference.class.SpacePreference, preference.class.Preference)
export class TSpacePreference extends TPreference implements SpacePreference {
  @Prop(TypeRef(core.class.Space), core.string.Space)
  declare attachedTo: Ref<Space>
}

export function createModel (builder: Builder): void {
  builder.createModel(TPreference, TSpacePreference)
}
