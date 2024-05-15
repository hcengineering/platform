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

import core, { type Domain, type Role, type RolesAssignment, Account, AccountRole, Ref, IndexKind } from '@hcengineering/core'
import { type Builder, Model, UX, Mixin, Prop, TypeString, Index, TypeAttachment, TypeRef } from '@hcengineering/model'
import { TDoc, TTypedSpace } from '@hcengineering/model-core'
import preference, { TPreference } from '@hcengineering/model-preference'
import tracker from '@hcengineering/model-tracker'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { type Drive, type File, type Folder, type StarredFile, driveId } from '@hcengineering/drive'

import drive from './plugin'
import { getEmbeddedLabel } from '@hcengineering/platform'

export { driveId } from '@hcengineering/drive'
export { drive as default }

export const DOMAIN_DRIVE = 'drive' as Domain

@Model(drive.class.Drive, core.class.TypedSpace)
@UX(drive.string.Drive)
export class TDrive extends TTypedSpace implements Drive {}

@Mixin(drive.mixin.DefaultDriveTypeData, drive.class.Drive)
@UX(getEmbeddedLabel('Default drive type'))
export class TDefaultDriveTypeData extends TDrive implements RolesAssignment {
  [key: Ref<Role>]: Ref<Account>[]
}

@Model(drive.class.Folder, core.class.Doc, DOMAIN_DRIVE)
@UX(drive.string.Folder)
export class TFolder extends TDoc implements Folder {
  declare space: Ref<Drive>

  @Prop(TypeString(), drive.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeRef(drive.class.Folder), drive.string.Parent)
  @Index(IndexKind.Indexed)
    parent!: Ref<Folder>

  @Prop(TypeRef(drive.class.Folder), drive.string.Parent)
    path!: Ref<Folder>[]
}

@Model(drive.class.File, core.class.Doc, DOMAIN_DRIVE)
@UX(drive.string.File)
export class TFile extends TDoc implements File {
  declare space: Ref<Drive>

  @Prop(TypeString(), drive.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeAttachment(), drive.string.File)
    file!: string

  @Prop(TypeString(), drive.string.Description)
  @Index(IndexKind.FullText)
    description!: string

  @Prop(TypeString(), drive.string.Size)
    size!: number

  @Prop(TypeString(), drive.string.Type)
    type!: string

  @Prop(TypeRef(drive.class.Folder), drive.string.Parent)
  @Index(IndexKind.Indexed)
    parent!: Ref<Folder>

  @Prop(TypeRef(drive.class.Folder), drive.string.Path)
    path!: Ref<Folder>[]
}

@Model(drive.class.StarredFile, preference.class.Preference)
export class TStarredFile extends TPreference implements StarredFile {
  @Prop(TypeRef(drive.class.File), drive.string.File)
  declare attachedTo: Ref<File>
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

  createAction(
    builder,
    {
      action: drive.actionImpl.EditDrive,
      label: drive.string.EditDrive,
      icon: view.icon.Edit,
      input: 'focus',
      category: drive.category.Drive,
      target: drive.class.Drive,
      visibilityTester: view.function.CanEditSpace,
      query: {},
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    drive.action.EditDrive
  )

  createAction(
    builder,
    {
      action: drive.actionImpl.CreateRootFolder,
      label: drive.string.CreateFolder,
      icon: drive.icon.Folder,
      category: view.category.General,
      input: 'none',
      target: drive.class.Drive,
      context: {
        mode: ['context', 'browser'],
        application: drive.app.Drive,
        group: 'create'
      }
    },
    drive.action.CreateRootFolder
  )
}

function defineFolder (builder: Builder): void {
  builder.createModel(TFolder)

  // Actions

  builder.mixin(drive.class.Folder, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.EditRelatedTargets, tracker.action.NewRelatedIssue]
  })

  createAction(
    builder,
    {
      action: drive.actionImpl.CreateChildFolder,
      label: drive.string.CreateFolder,
      icon: drive.icon.Folder,
      category: view.category.General,
      input: 'none',
      target: drive.class.Folder,
      context: {
        mode: ['context', 'browser'],
        application: drive.app.Drive,
        group: 'create'
      }
    },
    drive.action.CreateChildFolder
  )
}

function defineFile (builder: Builder): void {
  builder.createModel(TFile, TStarredFile)

  // Actions

  builder.mixin(drive.class.File, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.EditRelatedTargets, tracker.action.NewRelatedIssue]
  })
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
  defineFolder(builder)
  defineFile(builder)
  defineApplication(builder)
}
