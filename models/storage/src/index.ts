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

import core, { type Domain } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import workbench from '@hcengineering/model-workbench'
import storage from '@hcengineering/storage'

// import { TDoc } from '@hcengineering/model-core'
// import { type Resource } from '@hcengineering/platform'

export { storageId } from '@hcengineering/storage'
export { storage as default }

export const DOMAIN_STORAGE = 'storage' as Domain

function defineApplication (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: storage.string.Storage,
      icon: storage.icon.Storage,
      alias: storageId,
      hidden: false,
      // locationResolver: storage.resolver.Location,
      navigatorModel: {
        specials: [
          // {
          //   id: 'browser',
          //   accessLevel: AccountRole.User,
          //   label: document.string.Teamspaces,
          //   icon: view.icon.List,
          //   component: workbench.component.SpecialView,
          //   componentProps: {
          //     _class: document.class.Teamspace,
          //     label: document.string.Teamspaces
          //   },
          //   position: 'top'
          // }
        ],
        spaces: [
          // {
          //   id: 'teamspaces',
          //   label: document.string.Teamspaces,
          //   spaceClass: document.class.Teamspace,
          //   addSpaceLabel: document.string.CreateTeamspace,
          //   createComponent: document.component.CreateTeamspace,
          //   icon: document.icon.Teamspace,
          //   // intentionally left empty in order to make space presenter working
          //   specials: []
          // }
        ]
      }
      // navHeaderComponent: document.component.NewDocumentHeader
    },
    storage.app.Storage
  )
}

export function createModel (builder: Builder): void {
  defineApplication(builder)
}
