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

import core, { type Role, type RolesAssignment, Account, AccountRole, Ref } from '@hcengineering/core'
import { type Builder, Model, UX, Mixin } from '@hcengineering/model'
import { TTypedSpace } from '@hcengineering/model-core'
import tracker from '@hcengineering/model-tracker'
import view from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { type Drive, driveId } from '@hcengineering/drive'

import drive from './plugin'
import { getEmbeddedLabel } from '@hcengineering/platform'

export { driveId } from '@hcengineering/drive'
export { drive as default }

@Model(drive.class.Drive, core.class.TypedSpace)
@UX(drive.string.Drive, drive.icon.Drive, 'Drive', 'name')
export class TDrive extends TTypedSpace implements Drive {}

@Mixin(drive.mixin.DefaultDriveTypeData, drive.class.Drive)
@UX(getEmbeddedLabel('Default drive type'), drive.icon.Drive)
export class TDefaultDriveTypeData extends TDrive implements RolesAssignment {
  [key: Ref<Role>]: Ref<Account>[]
}

function defineDrive (builder: Builder): void {
  builder.createModel(TDrive, TDefaultDriveTypeData)

  // Space type

  builder.createDoc(
    core.class.SpaceTypeDescriptor,
    core.space.Model,
    {
      name: drive.string.Drive,
      description: drive.string.Description,
      icon: drive.icon.Drive,
      baseClass: drive.class.Drive,
      availablePermissions: [
        core.permission.UpdateSpace,
        core.permission.ArchiveSpace,
        core.permission.ForbidDeleteObject
      ]
    },
    drive.descriptor.DriveType
  )

  builder.createDoc(
    core.class.SpaceType,
    core.space.Model,
    {
      name: 'Default drive type',
      descriptor: drive.descriptor.DriveType,
      roles: 0,
      targetClass: drive.mixin.DefaultDriveTypeData
    },
    drive.spaceType.DefaultDrive
  )

  // Navigator
  builder.mixin(drive.class.Drive, core.class.Class, view.mixin.SpacePresenter, {
    presenter: drive.component.DriveSpacePresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: drive.class.Drive,
      descriptor: view.viewlet.Table,
      configOptions: {
        hiddenKeys: ['name', 'description']
      },
      config: ['', 'members', 'owners', 'private', 'archived']
    },
    drive.viewlet.DriveTable
  )

  // Actions

  builder.mixin(drive.class.Drive, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.EditRelatedTargets, tracker.action.NewRelatedIssue]
  })

  // createAction(
  //   builder,
  //   {
  //     action: drive.actionImpl.EditTeamspace,
  //     label: drive.string.EditTeamspace,
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
  //   drive.action.EditTeamspace
  // )
}

function defineApplication (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: drive.string.Drive,
      icon: drive.icon.Drive,
      alias: driveId,
      hidden: false,
      // locationResolver: drive.resolver.Location,
      navigatorModel: {
        specials: [
          {
            id: 'browser',
            accessLevel: AccountRole.User,
            label: drive.string.Drives,
            icon: view.icon.List,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: drive.class.Drive,
              label: drive.string.Drives
            },
            position: 'top'
          }
        ],
        spaces: [
          {
            id: 'drives',
            label: drive.string.Drive,
            spaceClass: drive.class.Drive,
            addSpaceLabel: drive.string.CreateDrive,
            createComponent: drive.component.CreateDrive,
            icon: drive.icon.Drive,
            // intentionally left empty in order to make space presenter working
            specials: []
          }
        ]
      }
      // navHeaderComponent: document.component.NewDocumentHeader
    },
    drive.app.Drive
  )
}

export function createModel (builder: Builder): void {
  defineDrive(builder)
  defineApplication(builder)
}
