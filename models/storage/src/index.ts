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

import core, { type Domain, type Role, type RolesAssignment, Account, AccountRole, Ref } from '@hcengineering/core'
import { type Builder, Model, UX, Mixin } from '@hcengineering/model'
import { TTypedSpace } from '@hcengineering/model-core'
import tracker from '@hcengineering/model-tracker'
import view from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { type Storage, storageId } from '@hcengineering/storage'

import storage from './plugin'
import { getEmbeddedLabel } from '@hcengineering/platform'

export { storageId } from '@hcengineering/storage'
export { storage as default }

export const DOMAIN_STORAGE = 'storage' as Domain

@Model(storage.class.Storage, core.class.TypedSpace)
@UX(storage.string.Storage, storage.icon.Storage, 'Storage', 'name')
export class TStorage extends TTypedSpace implements Storage {}

@Mixin(storage.mixin.DefaultStorageTypeData, storage.class.Storage)
@UX(getEmbeddedLabel('Default storage type'), storage.icon.Storage)
export class TDefaultStorageTypeData extends TStorage implements RolesAssignment {
  [key: Ref<Role>]: Ref<Account>[]
}

function defineStorage (builder: Builder): void {
  builder.createModel(TStorage, TDefaultStorageTypeData)

  // Space type

  builder.createDoc(
    core.class.SpaceTypeDescriptor,
    core.space.Model,
    {
      name: storage.string.Storage,
      description: storage.string.Description,
      icon: storage.icon.Storage,
      baseClass: storage.class.Storage,
      availablePermissions: [
        core.permission.UpdateSpace,
        core.permission.ArchiveSpace,
        core.permission.ForbidDeleteObject
      ]
    },
    storage.descriptor.StorageType
  )

  builder.createDoc(
    core.class.SpaceType,
    core.space.Model,
    {
      name: 'Default storage type',
      descriptor: storage.descriptor.StorageType,
      roles: 0,
      targetClass: storage.mixin.DefaultStorageTypeData
    },
    storage.spaceType.DefaultStorage
  )

  // Navigator
  builder.mixin(storage.class.Storage, core.class.Class, view.mixin.SpacePresenter, {
    presenter: storage.component.StorageSpacePresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: storage.class.Storage,
      descriptor: view.viewlet.Table,
      configOptions: {
        hiddenKeys: ['name', 'description']
      },
      config: ['', 'members', 'owners', 'private', 'archived']
    },
    storage.viewlet.StorageTable
  )

  // Actions

  builder.mixin(storage.class.Storage, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.EditRelatedTargets, tracker.action.NewRelatedIssue]
  })

  // createAction(
  //   builder,
  //   {
  //     action: storage.actionImpl.EditTeamspace,
  //     label: storage.string.EditTeamspace,
  //     icon: view.icon.Edit,
  //     input: 'focus',
  //     category: document.category.Document,
  //     target: document.class.Teamspace,
  //     visibilityTester: view.function.CanEditSpace,
  //     query: {},
  //     context: {
  //       mode: ['context', 'browser'],
  //       group: 'edit'
  //     }
  //   },
  //   storage.action.EditTeamspace
  // )
}

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
          {
            id: 'browser',
            accessLevel: AccountRole.User,
            label: storage.string.Storages,
            icon: view.icon.List,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: storage.class.Storage,
              label: storage.string.Storages
            },
            position: 'top'
          }
        ],
        spaces: [
          {
            id: 'storages',
            label: storage.string.Storage,
            spaceClass: storage.class.Storage,
            addSpaceLabel: storage.string.CreateStorage,
            createComponent: storage.component.CreateStorage,
            icon: storage.icon.Storage,
            // intentionally left empty in order to make space presenter working
            specials: []
          }
        ]
      }
      // navHeaderComponent: document.component.NewDocumentHeader
    },
    storage.app.Storage
  )
}

export function createModel (builder: Builder): void {
  defineStorage(builder)
  defineApplication(builder)
}
