//
// Copyright © 2024 Hardcore Engineering Inc.
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

import activity from '@hcengineering/activity'
import chunter from '@hcengineering/chunter'
import core, {
  type Blob,
  type Class,
  type CollectionSize,
  type Domain,
  type FindOptions,
  type Ref,
  type Role,
  type RolesAssignment,
  AccountRole,
  IndexKind,
  SortingOrder,
  type AccountUuid
} from '@hcengineering/core'
import {
  type Drive,
  type File,
  type FileVersion,
  type Folder,
  type Resource,
  TypeFileVersion,
  driveId
} from '@hcengineering/drive'
import {
  type Builder,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeFileSize,
  TypeRecord,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import { TAttachedDoc, TDoc, TType, TTypedSpace } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import print from '@hcengineering/model-print'
import tracker from '@hcengineering/model-tracker'
import view, { type Viewlet, actionTemplates, classPresenter, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { getEmbeddedLabel } from '@hcengineering/platform'

import drive from './plugin'

export { driveId } from '@hcengineering/drive'
export { driveOperation } from './migration'
export { drive as default }

export const DOMAIN_DRIVE = 'drive' as Domain

@Model(drive.class.TypeFileVersion, core.class.Type)
@UX(core.string.Number)
export class TTypeFileVersion extends TType {}

@Model(drive.class.Drive, core.class.TypedSpace)
@UX(drive.string.Drive)
export class TDrive extends TTypedSpace implements Drive {}

@Mixin(drive.mixin.DefaultDriveTypeData, drive.class.Drive)
@UX(getEmbeddedLabel('Default drive type'))
export class TDefaultDriveTypeData extends TDrive implements RolesAssignment {
  [key: Ref<Role>]: AccountUuid[]
}

@Model(drive.class.Resource, core.class.Doc, DOMAIN_DRIVE)
@UX(drive.string.Resource)
export class TResource extends TDoc implements Resource {
  declare space: Ref<Drive>

  @Prop(TypeString(), drive.string.Name)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeRef(drive.class.Resource), drive.string.Parent)
  @Index(IndexKind.Indexed)
  @ReadOnly()
    parent!: Ref<Resource>

  @Prop(TypeRef(drive.class.Resource), drive.string.Path)
  @ReadOnly()
    path!: Ref<Resource>[]

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number

  @Prop(TypeRef(drive.class.FileVersion), drive.string.Version)
  @ReadOnly()
    file?: Ref<FileVersion>
}

@Model(drive.class.Folder, drive.class.Resource, DOMAIN_DRIVE)
@UX(drive.string.Folder)
export class TFolder extends TResource implements Folder {
  @Prop(TypeRef(drive.class.Folder), drive.string.Parent)
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare parent: Ref<Folder>

  @Prop(TypeRef(drive.class.Folder), drive.string.Path)
  @ReadOnly()
  declare path: Ref<Folder>[]

  declare file: undefined
}

@Model(drive.class.File, drive.class.Resource, DOMAIN_DRIVE)
@UX(drive.string.File)
export class TFile extends TResource implements File {
  @Prop(TypeRef(drive.class.Folder), drive.string.Parent)
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare parent: Ref<Folder>

  @Prop(TypeRef(drive.class.Folder), drive.string.Path)
  @ReadOnly()
  declare path: Ref<Folder>[]

  @Prop(TypeRef(drive.class.FileVersion), drive.string.Version)
  @ReadOnly()
  declare file: Ref<FileVersion>

  @Prop(Collection(drive.class.FileVersion), drive.string.FileVersion)
  @ReadOnly()
    versions!: CollectionSize<FileVersion>

  @Prop(TypeFileVersion(), drive.string.Version)
  @ReadOnly()
    version!: number
}

@Model(drive.class.FileVersion, core.class.AttachedDoc, DOMAIN_DRIVE)
@UX(drive.string.FileVersion)
export class TFileVersion extends TAttachedDoc implements FileVersion {
  declare space: Ref<Drive>

  @Prop(TypeRef(drive.class.File), core.string.AttachedTo)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<File>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Index(IndexKind.Indexed)
  declare attachedToClass: Ref<Class<File>>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'versions' = 'versions'

  @Prop(TypeString(), drive.string.Name)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeRef(core.class.Blob), drive.string.File)
  @ReadOnly()
    file!: Ref<Blob>

  @Prop(TypeFileSize(), drive.string.Size)
  @ReadOnly()
    size!: number

  @Prop(TypeString(), drive.string.ContentType)
  @ReadOnly()
    type!: string

  @Prop(TypeTimestamp(), drive.string.LastModified)
  @ReadOnly()
    lastModified!: number

  @Prop(TypeRecord(), drive.string.Metadata)
  @ReadOnly()
    metadata?: Record<string, any>

  @Prop(TypeFileVersion(), drive.string.Version)
  @ReadOnly()
    version!: number
}

function defineTypes (builder: Builder): void {
  builder.createModel(TTypeFileVersion)

  classPresenter(
    builder,
    drive.class.TypeFileVersion,
    drive.component.FileVersionVersionPresenter,
    drive.component.FileVersionVersionPresenter
  )
}

function defineDrive (builder: Builder): void {
  builder.createModel(TDrive, TDefaultDriveTypeData)

  builder.mixin(drive.class.Drive, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: drive.component.DrivePresenter
  })

  builder.mixin(drive.class.Drive, core.class.Class, view.mixin.ObjectPanel, {
    component: drive.component.DrivePanel
  })

  builder.mixin(drive.class.Drive, core.class.Class, view.mixin.LinkProvider, {
    encode: drive.function.DriveLinkProvider
  })

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
      config: ['', 'members', 'owners', 'private', 'archived'],
      viewOptions: {
        groupBy: [],
        orderBy: [],
        other: [
          {
            key: 'hideArchived',
            type: 'toggle',
            defaultValue: true,
            actionTarget: 'options',
            action: view.function.HideArchived,
            label: view.string.HideArchived
          }
        ]
      }
    },
    drive.viewlet.DriveTable
  )

  // Actions

  builder.mixin(drive.class.Drive, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.EditRelatedTargets, print.action.Print, tracker.action.NewRelatedIssue]
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
      category: drive.category.Drive,
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

function defineResource (builder: Builder): void {
  builder.createModel(TResource)

  builder.mixin(drive.class.Resource, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: drive.component.ResourcePresenter
  })

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: drive.class.Resource,
      descriptor: view.viewlet.Table,
      config: [
        {
          key: '',
          presenter: drive.component.ResourcePresenter,
          label: drive.string.Name,
          sortingKey: 'title'
        },
        '$lookup.file.size',
        'comments',
        '$lookup.file.lastModified',
        'createdBy'
      ],
      /* eslint-disable @typescript-eslint/consistent-type-assertions */
      options: {
        lookup: {
          file: drive.class.FileVersion
        },
        sort: {
          _class: SortingOrder.Descending
        }
      } as FindOptions<Resource>,
      configOptions: {
        hiddenKeys: ['title', 'parent', 'path', 'file', 'versions'],
        sortable: true
      }
    },
    drive.viewlet.FileTable
  )

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: drive.string.Grid,
      icon: drive.icon.Grid,
      component: drive.component.GridView
    },
    drive.viewlet.Grid
  )

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: drive.class.Resource,
      descriptor: drive.viewlet.Grid,
      viewOptions: {
        groupBy: [],
        orderBy: [
          ['title', SortingOrder.Ascending],
          ['$lookup.file.size', SortingOrder.Ascending],
          ['$lookup.file.modifiedOn', SortingOrder.Descending]
        ],
        other: []
      },
      config: [
        {
          key: '',
          presenter: drive.component.ResourcePresenter,
          label: drive.string.Name,
          sortingKey: 'title'
        },
        '$lookup.file.size',
        '$lookup.file.modifiedOn',
        'createdBy'
      ],
      configOptions: {
        hiddenKeys: ['title', 'parent', 'path', 'file', 'versions'],
        sortable: true
      },
      /* eslint-disable @typescript-eslint/consistent-type-assertions */
      options: {
        lookup: {
          file: drive.class.FileVersion
        },
        sort: {
          _class: SortingOrder.Descending
        }
      } as FindOptions<Resource>
    },
    drive.viewlet.FileGrid
  )
}

function defineFolder (builder: Builder): void {
  builder.createModel(TFolder)

  builder.mixin(drive.class.Folder, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: drive.component.FolderPresenter
  })

  builder.mixin(drive.class.Folder, core.class.Class, view.mixin.ObjectEditor, {
    editor: drive.component.EditFolder
  })

  builder.mixin(drive.class.Folder, core.class.Class, view.mixin.ObjectPanel, {
    component: drive.component.FolderPanel
  })

  builder.mixin(drive.class.Folder, core.class.Class, view.mixin.LinkProvider, {
    encode: drive.function.FolderLinkProvider
  })

  // Search

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      title: drive.string.Folders,
      icon: drive.icon.Drive,
      label: presentation.string.Search,
      query: drive.completion.FolderQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: drive.class.Folder,
      priority: 700
    },
    drive.completion.FolderCategory
  )

  // Actions

  builder.mixin(drive.class.Folder, core.class.Class, view.mixin.IgnoreActions, {
    actions: [
      view.action.Open,
      view.action.OpenInNewTab,
      print.action.Print,
      tracker.action.EditRelatedTargets,
      tracker.action.NewRelatedIssue
    ]
  })

  createAction(
    builder,
    {
      action: drive.actionImpl.CreateChildFolder,
      label: drive.string.CreateFolder,
      icon: drive.icon.Folder,
      category: drive.category.Drive,
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

  createAction(
    builder,
    {
      action: drive.actionImpl.RenameFolder,
      label: drive.string.Rename,
      icon: view.icon.Edit,
      category: drive.category.Drive,
      input: 'none',
      target: drive.class.Folder,
      context: {
        mode: ['context', 'browser'],
        application: drive.app.Drive,
        group: 'edit'
      },
      visibilityTester: drive.function.CanRenameFolder
    },
    drive.action.RenameFolder
  )

  createAction(builder, {
    ...actionTemplates.move,
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: drive.component.MoveResource,
      element: 'top',
      fillProps: {
        _object: 'value'
      }
    },
    target: drive.class.Folder,
    context: {
      mode: ['browser', 'context'],
      group: 'tools'
    }
  })
}

function defineFileVersion (builder: Builder): void {
  builder.createModel(TFileVersion)

  builder.mixin(drive.class.FileVersion, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: drive.component.FileVersionPresenter
  })

  // Actions

  builder.mixin(drive.class.FileVersion, core.class.Class, view.mixin.IgnoreActions, {
    actions: [
      view.action.Open,
      view.action.OpenInNewTab,
      view.action.Delete,
      print.action.Print,
      tracker.action.EditRelatedTargets,
      tracker.action.NewRelatedIssue
    ]
  })

  createAction(
    builder,
    {
      action: drive.actionImpl.RestoreFileVersion,
      label: drive.string.Restore,
      icon: drive.icon.Restore,
      category: drive.category.Drive,
      input: 'none',
      target: drive.class.FileVersion,
      context: {
        mode: ['context', 'browser'],
        application: drive.app.Drive,
        group: 'edit'
      }
    },
    drive.action.RestoreFileVersion
  )

  createAction(
    builder,
    {
      action: view.actionImpl.Delete,
      visibilityTester: drive.function.CanDeleteFileVersion,
      label: view.string.Delete,
      icon: view.icon.Delete,
      category: drive.category.Drive,
      input: 'none',
      target: drive.class.FileVersion,
      context: {
        mode: ['context', 'browser'],
        application: drive.app.Drive,
        group: 'edit'
      }
    },
    drive.action.DeleteFileVersion
  )
}

function defineFile (builder: Builder): void {
  builder.createModel(TFile)

  builder.mixin(drive.class.File, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: drive.component.FilePresenter
  })

  builder.mixin(drive.class.File, core.class.Class, view.mixin.ObjectEditor, {
    editor: drive.component.EditFile
  })

  builder.mixin(drive.class.File, core.class.Class, view.mixin.ObjectPanel, {
    component: drive.component.FilePanel
  })

  builder.mixin(drive.class.File, core.class.Class, view.mixin.LinkProvider, {
    encode: drive.function.FileLinkProvider
  })

  // Activity

  builder.mixin(drive.class.File, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: drive.class.File,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  // Search

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      title: drive.string.Files,
      icon: drive.icon.Drive,
      label: presentation.string.Search,
      query: drive.completion.FileQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: drive.class.File,
      priority: 600
    },
    drive.completion.FileCategory
  )

  // Actions

  builder.mixin(drive.class.File, core.class.Class, view.mixin.IgnoreActions, {
    actions: [
      view.action.Open,
      view.action.OpenInNewTab,
      print.action.Print,
      tracker.action.EditRelatedTargets,
      tracker.action.NewRelatedIssue
    ]
  })

  createAction(
    builder,
    {
      action: drive.actionImpl.DownloadFile,
      label: drive.string.Download,
      icon: drive.icon.Download,
      category: drive.category.Drive,
      input: 'none',
      target: drive.class.File,
      context: {
        mode: ['context', 'browser'],
        application: drive.app.Drive,
        group: 'tools'
      }
    },
    drive.action.DownloadFile
  )

  createAction(
    builder,
    {
      action: drive.actionImpl.RenameFile,
      label: drive.string.Rename,
      icon: view.icon.Edit,
      category: drive.category.Drive,
      input: 'none',
      target: drive.class.File,
      context: {
        mode: ['context', 'browser'],
        application: drive.app.Drive,
        group: 'edit'
      },
      visibilityTester: drive.function.CanRenameFile
    },
    drive.action.RenameFile
  )

  // createAction(
  //   builder,
  //   {
  //     action: drive.actionImpl.UploadFile,
  //     label: drive.string.UploadFile,
  //     icon: drive.icon.File,
  //     category: drive.category.Drive,
  //     input: 'focus',
  //     target: drive.class.File,
  //     context: {
  //       mode: ['context', 'browser'],
  //       application: drive.app.Drive,
  //       group: 'tools'
  //     }
  //   },
  //   drive.action.UploadFile
  // )

  createAction(builder, {
    ...actionTemplates.move,
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: drive.component.MoveResource,
      element: 'top',
      fillProps: {
        _object: 'value'
      }
    },
    target: drive.class.File,
    context: {
      mode: ['browser', 'context'],
      group: 'tools'
    }
  })
}

function defineApplication (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: drive.string.Drive,
      icon: drive.icon.DriveApplication,
      alias: driveId,
      hidden: false,
      locationResolver: drive.resolver.Location,
      navigatorModel: {
        specials: [
          {
            id: 'browser',
            accessLevel: AccountRole.User,
            label: drive.string.Drives,
            icon: drive.icon.Drives,
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
      },
      navHeaderComponent: drive.component.DriveSpaceHeader
    },
    drive.app.Drive
  )
}

export function createModel (builder: Builder): void {
  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: view.string.Grid,
      icon: view.icon.Table,
      component: drive.component.GridView
    },
    drive.viewlet.Grid
  )

  defineTypes(builder)
  defineDrive(builder)
  defineResource(builder)
  defineFolder(builder)
  defineFile(builder)
  defineFileVersion(builder)
  defineApplication(builder)
}
