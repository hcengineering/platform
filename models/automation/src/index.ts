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

// To help typescript locate view plugin properly
import {
  Builder,
  Model,
  UX
} from '@anticrm/model'
import core, { TAttachedDoc } from '@anticrm/model-core'

import automation, { Automation } from '@anticrm/automation'

@Model(automation.class.Automation, core.class.AttachedDoc)
@UX(automation.string.Automation)
export class TAutomation extends TAttachedDoc implements Automation {
  color!: number
  background!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TAutomation)
}

export { boardOperation } from './migration'
