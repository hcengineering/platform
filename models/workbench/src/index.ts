//
// Copyright © 2020 Anticrm Platform Contributors.
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

import type { IntlString, Asset } from '@anticrm/platform'
import { DOMAIN_MODEL } from '@anticrm/core' 
import { Model, Mixin, Builder } from '@anticrm/model'
import type { Application, SpaceView, ViewConfiguration } from '@anticrm/workbench'

import core, { TDoc, TClass } from '@anticrm/model-core'
import workbench from './plugin'

@Model(workbench.class.Application, core.class.Doc, DOMAIN_MODEL)
export class TApplication extends TDoc implements Application {
  label!: IntlString
  icon!: Asset
}

@Mixin(workbench.mixin.SpaceView, core.class.Class)
export class TSpaceView extends TClass implements SpaceView {
  view!: ViewConfiguration
}

export function createModel(builder: Builder) {
  builder.createModel(TApplication, TSpaceView)
}

export default workbench
