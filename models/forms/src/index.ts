//
// Copyright © 2026 TraceX SAS.
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

import card, { type CardSpace, type MasterTag } from '@hcengineering/card'
import core, { AccountRole, IndexKind, type Ref } from '@hcengineering/core'
import forms, { DOMAIN_FORMS, formsId, type FormConfiguration } from '@hcengineering/forms'
import formsResources from '@hcengineering/forms-resources/src/plugin'
import { Builder, Index, Model, Prop, TypeBoolean, TypeRef, TypeString } from '@hcengineering/model'
import { TDoc } from '@hcengineering/model-core'
import setting from '@hcengineering/setting'

export { formsId }
export default forms

@Model(forms.class.FormConfiguration, core.class.Doc, DOMAIN_FORMS)
export class TFormConfiguration extends TDoc implements FormConfiguration {
  @Prop(TypeString(), formsResources.string.FormMode)
    mode?: FormConfiguration['mode']
  @Prop(TypeRef(card.class.MasterTag), card.string.MasterTag)
  @Index(IndexKind.Indexed)
    masterTag!: Ref<MasterTag>

  @Prop(TypeBoolean(), forms.string.Enabled)
    enabled!: boolean

  @Prop(TypeRef(card.class.CardSpace), forms.string.TargetSpace)
    targetSpace?: Ref<CardSpace>
}

/** Registers Forms models and its extension in card type settings. */
export function createModel (builder: Builder): void {
  builder.createModel(TFormConfiguration)
  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: formsId,
    label: forms.string.Forms,
    component: formsResources.component.FormSettings,
    masterOnly: true
  })
  builder.createDoc(setting.class.WorkspaceSettingCategory, core.space.Model, {
    name: formsId,
    label: forms.string.Forms,
    icon: card.icon.Card,
    component: formsResources.component.WorkspaceForms,
    group: 'settings-editor',
    role: AccountRole.Maintainer,
    order: 4502
  })
}
