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

import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import workbench from '@hcengineering/workbench'
import exportPlugin from './plugin'

export { exportId } from '@hcengineering/export'
export * from './migration'
export default exportPlugin

export function createModel (builder: Builder): void {
  builder.createDoc(
    presentation.class.ComponentPointExtension,
    core.space.Model,
    {
      extension: workbench.extensions.SpecialViewAction,
      component: exportPlugin.component.ExportButton
    },
    exportPlugin.extensions.ExportButton
  )
}
