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

import core, { Class, Doc } from '@hcengineering/core'
import { Builder } from '@hcengineering/model'
import serverCore, { ObjectDDParticipant } from '@hcengineering/server-core'
import serverTags from '@hcengineering/server-tags'
import tags from '@hcengineering/tags'

export { serverTagsId } from '@hcengineering/server-tags'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTags.trigger.onTagReference
  })

  builder.mixin<Class<Doc>, ObjectDDParticipant>(
    tags.class.TagElement,
    core.class.Class,
    serverCore.mixin.ObjectDDParticipant,
    {
      collectDocs: serverTags.function.TagElementRemove
    }
  )
}
