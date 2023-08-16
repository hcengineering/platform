//
// Copyright © 2023 Hardcore Engineering Inc.
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

import core from '@hcengineering/core'
import { Builder } from '@hcengineering/model'
import intercom from '@hcengineering/intercom'
import support from '@hcengineering/support'

export { intercomId } from '@hcengineering/intercom'
export { intercom as default }

export function createModel (builder: Builder): void {
  builder.createDoc(
    support.class.SupportSystem,
    core.space.Model,
    {
      name: 'Intercom',
      factory: intercom.function.GetWidget
    },
    intercom.ids.Intercom
  )
}
