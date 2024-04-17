//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
import type { Class, CollaborativeDoc, CollectionSize, Domain, Ref } from '@hcengineering/core'
import { IndexKind } from '@hcengineering/core'
import {
  type Document,
  type DocumentEmbedding,
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
  Model,
  Prop,
  TypeNumber,
  TypeRef,
  TypeString,
  UX,
  TypeCollaborativeDoc,
  TypeCollaborativeDocVersion
} from '@hcengineering/model'
import attachment, { TAttachment } from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, { TAttachedDoc, TTypedSpace } from '@hcengineering/model-core'
import { createPublicLinkAction } from '@hcengineering/model-guest'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import preference, { TPreference } from '@hcengineering/model-preference'
import presentation from '@hcengineering/model-presentation'
import tracker from '@hcengineering/model-tracker'
import view, { actionTemplates, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import { type Asset } from '@hcengineering/platform'
import tags from '@hcengineering/tags'
import time from '@hcengineering/time'
import document from './plugin'

export { documentId } from '@hcengineering/document'

export { documentOperation } from './migration'
export { document as default }

export const DOMAIN_DOCUMENT = 'document' as Domain

@Model(document.class.DocumentEmbedding, attachment.class.Attachment)
@UX(document.string.Embedding)
export class TDocumentEmbedding extends TAttachment implements DocumentEmbedding {
  declare attachedTo: Ref<Document>
  declare attachedToClass: Ref<Class<Document>>
}

@Model(document.class.Document, core.class.AttachedDoc, DOMAIN_DOCUMENT)
@UX(document.string.Document, document.icon.Document, undefined, 'name', undefined, document.string.Documents)
export class TDocument extends TAttachedDoc implements Document {
  @Prop(TypeRef(document.class.Document), document.string.ParentDocument)
  declare attachedTo: Ref<Document>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  @Hidden()
  declare attachedToClass: Ref<Class<Document>>

  @Prop(TypeRef(core.class.Space), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Teamspace>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'children' = 'children'

  @Prop(TypeString(), document.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeCollaborativeDoc(), document.string.Document)
  @Hidden()
    content!: CollaborativeDoc

  @Prop(Collection(document.class.Document), document.string.ChildDocument)
    children!: CollectionSize<Document>

  @Prop(Collection(document.class.DocumentEmbedding), document.string.Embeddings)
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
}

@Model(document.class.DocumentSnapshot, core.class.AttachedDoc, DOMAIN_DOCUMENT)
@UX(document.string.Version)
export class TDocumentSnapshot extends TAttachedDoc implements DocumentSnapshot {
  @Prop(TypeRef(document.class.Document), document.string.ParentDocument)
  declare attachedTo: Ref<Document>

  @Prop(TypeRef(core.class.Class), core.string.AttachedToClass)
  declare attachedToClass: Ref<Class<Document>>

  @Prop(TypeRef(core.class.Space), core.string.Space)
  @Index(IndexKind.Indexed)
  @Hidden()
  declare space: Ref<Teamspace>

  @Prop(TypeString(), core.string.Collection)
  @Hidden()
  override collection: 'snapshots' = 'snapshots'

  @Prop(TypeString(), document.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeCollaborativeDocVersion(), document.string.Document)
  @Hidden()
    content!: CollaborativeDoc
}

@Model(document.class.SavedDocument, preference.class.Preference)
export class TSavedDocument extends TPreference implements SavedDocument {
  @Prop(TypeRef(document.class.Document), document.string.SavedDocuments)
  declare attachedTo: Ref<Document>
}

@Model(document.class.Teamspace, core.class.TypedSpace)
@UX(document.string.Teamspace, document.icon.Teamspace, 'Teamspace', 'name')
export class TTeamspace extends TTypedSpace implements Teamspace {}

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
      availablePermissions: [core.permission.ForbidDeleteObject]
    },
    document.descriptor.TeamspaceType
  )

  // Navigator

  builder.mixin(document.class.Teamspace, core.class.Class, view.mixin.SpacePresenter, {
    presenter: document.component.TeamspaceSpacePresenter
  })

  // Actions

  builder.mixin(document.class.Teamspace, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.EditRelatedTargets]
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
  builder.createModel(TDocument, TDocumentSnapshot, TDocumentEmbedding, TSavedDocument)

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

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectIcon, {
    component: document.component.DocumentIcon
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
      keyBinding: [],
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
      providers: {
        [notification.providers.PlatformNotification]: true,
        [notification.providers.BrowserNotification]: false
      }
    },
    document.ids.ContentNotification
  )

  generateClassNotificationTypes(
    builder,
    document.class.Document,
    document.ids.DocumentNotificationGroup,
    [],
    ['attachments', 'children', 'comments']
  )

  // Activity & Inbox

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: document.function.DocumentTitleProvider
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: document.class.Document,
    components: { input: chunter.component.ChatMessageInput }
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
      classToSearch: document.class.Document
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
        specials: [],
        spaces: [
          {
            id: 'teamspaces',
            label: document.string.Teamspaces,
            spaceClass: document.class.Teamspace,
            addSpaceLabel: document.string.CreateTeamspace,
            createComponent: document.component.CreateTeamspace,
            visibleIf: document.function.IsTeamspaceVisible,
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
