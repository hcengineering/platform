//
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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
import type {
  CollectionSize,
  MarkupBlobRef,
  Domain,
  Rank,
  Ref,
  Role,
  RolesAssignment,
  PersonId
} from '@hcengineering/core'
import { AccountUuid, AccountRole, IndexKind } from '@hcengineering/core'
import {
  type Document,
  type DocumentSnapshot,
  type SavedDocument,
  type Teamspace,
  documentId
} from '@hcengineering/document'
import {
  type Builder,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeCollaborativeDoc,
  TypeNumber,
  TypeRef,
  TypeString,
  TypePersonId,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, { TDoc, TTypedSpace } from '@hcengineering/model-core'
import { createPublicLinkAction } from '@hcengineering/model-guest'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import preference, { TPreference } from '@hcengineering/model-preference'
import presentation from '@hcengineering/model-presentation'
import tracker from '@hcengineering/model-tracker'
import view, { actionTemplates, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import { type Asset, getEmbeddedLabel } from '@hcengineering/platform'
import tags from '@hcengineering/tags'
import time, { type ToDo, type Todoable } from '@hcengineering/time'
import document from './plugin'

export { documentId } from '@hcengineering/document'

export { documentOperation } from './migration'
export { document as default }

export const DOMAIN_DOCUMENT = 'document' as Domain

@Model(document.class.Document, core.class.Doc, DOMAIN_DOCUMENT)
@UX(document.string.Document, document.icon.Document, undefined, 'name', undefined, document.string.Documents)
export class TDocument extends TDoc implements Document, Todoable {
  @Prop(TypeString(), document.string.Name)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeCollaborativeDoc(), document.string.Document)
    content!: MarkupBlobRef | null

  @Prop(TypeRef(document.class.Document), document.string.ParentDocument)
    parent!: Ref<Document>

  @Prop(TypeRef(core.class.Space), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Teamspace>

  @Prop(TypePersonId(), document.string.LockedBy)
  @Hidden()
    lockedBy?: PersonId

  @Prop(Collection(attachment.class.Embedding), attachment.string.Embeddings)
    embeddings?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number

  @Prop(Collection(tags.class.TagReference), document.string.Labels)
    labels?: number

  @Prop(Collection(activity.class.ActivityReference), document.string.Backlinks)
  @Hidden()
    references!: number

  @Prop(TypeString(), document.string.Icon)
  @Hidden()
  @Index(IndexKind.FullText)
    icon?: Asset

  @Prop(TypeNumber(), document.string.Color)
  @Hidden()
  @Index(IndexKind.FullText)
    color?: number

  @Prop(Collection(time.class.ToDo), getEmbeddedLabel('Action Items'))
    todos?: CollectionSize<ToDo>

  @Index(IndexKind.Indexed)
  @Hidden()
    rank!: Rank
}

@Model(document.class.DocumentSnapshot, core.class.Doc, DOMAIN_DOCUMENT)
@UX(document.string.Version)
export class TDocumentSnapshot extends TDoc implements DocumentSnapshot {
  @Prop(TypeRef(core.class.Space), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Teamspace>

  @Prop(TypeString(), document.string.Name)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeCollaborativeDoc(), document.string.Document)
  @ReadOnly()
    content!: MarkupBlobRef

  @Prop(TypeRef(document.class.Document), document.string.ParentDocument)
    parent!: Ref<Document>
}

@Model(document.class.SavedDocument, preference.class.Preference)
export class TSavedDocument extends TPreference implements SavedDocument {
  @Prop(TypeRef(document.class.Document), document.string.SavedDocuments)
  declare attachedTo: Ref<Document>
}

@Model(document.class.Teamspace, core.class.TypedSpace)
@UX(document.string.Teamspace, document.icon.Teamspace, 'Teamspace', 'name')
export class TTeamspace extends TTypedSpace implements Teamspace {}

@Mixin(document.mixin.DefaultTeamspaceTypeData, document.class.Teamspace)
@UX(getEmbeddedLabel('Default teamspace type'), document.icon.Document)
export class TDefaultTeamspaceTypeData extends TTeamspace implements RolesAssignment {
  [key: Ref<Role>]: AccountUuid[]
}

function defineTeamspace (builder: Builder): void {
  builder.createModel(TTeamspace)

  builder.createDoc(
    core.class.SpaceTypeDescriptor,
    core.space.Model,
    {
      name: document.string.DocumentApplication,
      description: document.string.Description,
      icon: document.icon.Document,
      baseClass: document.class.Teamspace,
      availablePermissions: [
        core.permission.UpdateSpace,
        core.permission.ArchiveSpace,
        core.permission.ForbidDeleteObject
      ]
    },
    document.descriptor.TeamspaceType
  )

  builder.createDoc(
    core.class.SpaceType,
    core.space.Model,
    {
      name: 'Default teamspace type',
      descriptor: document.descriptor.TeamspaceType,
      roles: 0,
      targetClass: document.mixin.DefaultTeamspaceTypeData
    },
    document.spaceType.DefaultTeamspaceType
  )

  // Navigator

  builder.mixin(document.class.Teamspace, core.class.Class, view.mixin.SpacePresenter, {
    presenter: document.component.TeamspaceSpacePresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: document.class.Teamspace,
      descriptor: view.viewlet.Table,
      configOptions: {
        hiddenKeys: ['name', 'description']
      },
      config: ['', 'members', 'private', 'archived'],
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
    document.viewlet.TeamspaceTable
  )

  // Actions

  builder.mixin(document.class.Teamspace, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.EditRelatedTargets, tracker.action.NewRelatedIssue]
  })

  createAction(
    builder,
    {
      action: document.actionImpl.EditTeamspace,
      label: document.string.EditTeamspace,
      icon: view.icon.Edit,
      input: 'focus',
      category: document.category.Document,
      target: document.class.Teamspace,
      visibilityTester: view.function.CanEditSpace,
      query: {},
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    document.action.EditTeamspace
  )

  createAction(
    builder,
    {
      action: document.actionImpl.CreateDocument,
      label: document.string.CreateDocument,
      icon: document.icon.Add,
      input: 'focus',
      category: document.category.Document,
      target: document.class.Teamspace,
      inline: true,
      query: {
        archived: false
      },
      context: {
        mode: ['context', 'browser'],
        application: document.app.Documents,
        group: 'create'
      }
    },
    document.action.CreateDocument
  )

  createPublicLinkAction(builder, document.class.Document, document.action.PublicLink)
}

function defineDocument (builder: Builder): void {
  builder.createModel(TDocument, TDocumentSnapshot, TSavedDocument, TDefaultTeamspaceTypeData)

  builder.mixin(document.class.Document, core.class.Class, time.mixin.ItemPresenter, {
    presenter: document.component.DocumentToDoPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectFactory, {
    component: document.component.CreateDocument
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectEditor, {
    editor: document.component.EditDoc
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectPanel, {
    component: document.component.EditDoc
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: document.component.DocumentPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.LinkProvider, {
    encode: document.function.GetObjectLinkFragment
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.LinkIdProvider, {
    encode: document.function.GetDocumentLinkId,
    decode: document.function.ParseDocumentId
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectIcon, {
    component: document.component.DocumentIcon
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: document.component.DocumentInlineEditor
  })

  // Actions

  createAction(builder, {
    ...actionTemplates.open,
    actionProps: {
      component: document.component.EditDoc
    },
    target: document.class.Document,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    },
    override: [view.action.Open]
  })

  createAction(builder, {
    ...actionTemplates.move,
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: document.component.Move,
      element: 'top',
      fillProps: {
        _object: 'value'
      }
    },
    target: document.class.Document,
    context: {
      mode: ['browser', 'context'],
      group: 'tools'
    }
  })

  createAction(
    builder,
    {
      action: document.actionImpl.CreateChildDocument,
      label: document.string.CreateDocument,
      icon: document.icon.Add,
      input: 'focus',
      category: document.category.Document,
      target: document.class.Document,
      context: {
        mode: ['context', 'browser'],
        application: document.app.Documents,
        group: 'create'
      }
    },
    document.action.CreateChildDocument
  )

  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: document.function.GetDocumentLink
      },
      label: document.string.CopyDocumentUrl,
      icon: view.icon.CopyLink,
      input: 'focus',
      category: document.category.Document,
      target: document.class.Document,
      context: {
        mode: ['context', 'browser'],
        application: document.app.Documents,
        group: 'copy'
      }
    },
    document.action.CopyDocumentLink
  )

  createAction(
    builder,
    {
      action: document.actionImpl.LockContent,
      label: document.string.Lock,
      icon: document.icon.Lock,
      input: 'focus',
      category: document.category.Document,
      target: document.class.Document,
      context: {
        mode: ['context', 'browser'],
        application: document.app.Documents,
        group: 'copy'
      },
      visibilityTester: document.function.CanLockDocument
    },
    document.action.LockContent
  )

  createAction(
    builder,
    {
      action: document.actionImpl.UnlockContent,
      label: document.string.Unlock,
      icon: document.icon.Unlock,
      input: 'focus',
      category: document.category.Document,
      target: document.class.Document,
      context: {
        mode: ['context', 'browser'],
        application: document.app.Documents,
        group: 'copy'
      },
      visibilityTester: document.function.CanUnlockDocument
    },
    document.action.UnlockContent
  )

  // Notifications

  builder.mixin(document.class.Document, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(document.class.Document, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'modifiedBy']
  })

  builder.mixin(document.class.Document, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: document.component.NotificationDocumentPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open, view.action.OpenInNewTab, tracker.action.NewRelatedIssue]
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: document.string.DocumentApplication,
      icon: document.icon.DocumentApplication,
      objectClass: document.class.Document
    },
    document.ids.DocumentNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      allowedForAuthor: false,
      label: document.string.Document,
      group: document.ids.DocumentNotificationGroup,
      field: 'content',
      txClasses: [core.class.TxUpdateDoc],
      objectClass: document.class.Document,
      defaultEnabled: false,
      templates: {
        textTemplate: '{body}',
        htmlTemplate: '<p>{body}</p>',
        subjectTemplate: '{title}'
      }
    },
    document.ids.ContentNotification
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.InboxNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [document.ids.ContentNotification]
  })

  generateClassNotificationTypes(
    builder,
    document.class.Document,
    document.ids.DocumentNotificationGroup,
    [],
    ['attachments', 'comments']
  )

  // Activity & Inbox

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: document.function.DocumentTitleProvider
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: document.class.Document,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  // Search

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      title: document.string.Documents,
      icon: document.icon.Document,
      label: document.string.SearchDocument,
      query: document.completion.DocumentQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: document.class.Document,
      priority: 800
    },
    document.completion.DocumentQueryCategory
  )
}

function defineApplication (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: document.string.DocumentApplication,
      icon: document.icon.DocumentApplication,
      alias: documentId,
      hidden: false,
      locationResolver: document.resolver.Location,
      navigatorModel: {
        specials: [
          {
            id: 'browser',
            accessLevel: AccountRole.User,
            label: document.string.Teamspaces,
            icon: view.icon.List,
            component: workbench.component.SpecialView,
            componentProps: {
              _class: document.class.Teamspace,
              icon: view.icon.List,
              label: document.string.Teamspaces
            },
            position: 'top'
          }
        ],
        spaces: [
          {
            id: 'teamspaces',
            label: document.string.Teamspaces,
            spaceClass: document.class.Teamspace,
            addSpaceLabel: document.string.CreateTeamspace,
            createComponent: document.component.CreateTeamspace,
            icon: document.icon.Teamspace,
            // intentionally left empty in order to make space presenter working
            specials: []
          }
        ]
      },
      navHeaderComponent: document.component.NewDocumentHeader
    },
    document.app.Documents
  )
}

export function createModel (builder: Builder): void {
  defineTeamspace(builder)
  defineDocument(builder)

  defineApplication(builder)

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_DOCUMENT,
    disabled: [
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { attachedToClass: 1 },
      { createdOn: -1 },
      { attachedTo: 1 }
    ]
  })
}
