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

import contact, { Employee } from '@hcengineering/contact'
import type { Domain, Markup, Ref } from '@hcengineering/core'
import { IndexKind } from '@hcengineering/core'
import {
  CollaboratorDocument,
  Document,
  DocumentRequest,
  DocumentRequestKind,
  DocumentVersion,
  DocumentVersionState,
  documentId
} from '@hcengineering/document'
import {
  ArrOf,
  Builder,
  Collection,
  Hidden,
  Index,
  Model,
  Prop,
  ReadOnly,
  TypeNumber,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment, { TAttachment } from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import view, { actionTemplates, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import tags from '@hcengineering/tags'
import document from './plugin'

export { documentId } from '@hcengineering/document'
export { documentOperation } from './migration'
export { document as default }

export const DOMAIN_DOCUMENT = 'document' as Domain

@Model(document.class.DocumentRequest, core.class.AttachedDoc, DOMAIN_DOCUMENT)
@UX(document.string.Document)
export class TDocumentRequest extends TAttachedDoc implements DocumentRequest {
  kind!: DocumentRequestKind
  assignee!: Ref<Employee>
  message!: Markup
}

@Model(document.class.CollaboratorDocument, attachment.class.Attachment, DOMAIN_DOCUMENT)
@UX(document.string.Document)
export class TCollaboratorDocument extends TAttachment implements CollaboratorDocument {}

@Model(document.class.DocumentVersion, core.class.AttachedDoc, DOMAIN_DOCUMENT)
@UX(document.string.Version)
export class TDocumentVersion extends TAttachedDoc implements DocumentVersion {
  @Prop(TypeNumber(), document.string.Version)
  @Index(IndexKind.FullText)
  @ReadOnly()
    version!: number

  @Prop(TypeString(), document.string.Description)
  @Index(IndexKind.FullText)
    description!: Markup

  @Prop(TypeString(), document.string.Description)
  @Index(IndexKind.FullText)
    reason!: Markup

  @Prop(TypeString(), document.string.Description)
  @Index(IndexKind.FullText)
    impact!: Markup

  // @Prop(TypeString(), document.string.Status)
  state!: DocumentVersionState

  @Prop(TypeString(), document.string.Document)
  @Hidden()
    content!: Markup

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments!: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments!: number

  contentAttachmentId!: Ref<CollaboratorDocument>
  initialContentId!: Ref<CollaboratorDocument>
}

@Model(document.class.Document, core.class.Doc, DOMAIN_DOCUMENT)
@UX(document.string.Document, document.icon.Document, undefined, 'name')
export class TDocument extends TDoc implements Document {
  @Prop(TypeString(), document.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeNumber(), document.string.Version)
  @ReadOnly()
  @Hidden()
    version!: number

  @Prop(TypeNumber(), document.string.LastRevision)
  @ReadOnly()
  @Hidden()
    latest!: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(Collection(tags.class.TagReference), document.string.Labels)
    labels?: number

  @Prop(Collection(document.class.DocumentVersion), document.string.Version)
  @Hidden()
    versions!: number

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), document.string.Authors)
    authors!: Ref<Employee>[]

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), document.string.Reviewers)
    reviewers!: Ref<Employee>[]

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), document.string.Approvers)
    approvers!: Ref<Employee>[]

  @Prop(Collection(document.class.DocumentRequest), document.string.Requests)
  @Hidden()
    requests!: number
}

export function createModel (builder: Builder): void {
  builder.createModel(TDocument, TDocumentVersion, TCollaboratorDocument, TDocumentRequest)

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: document.string.DocumentApplication,
      icon: document.icon.DocumentApplication,
      alias: documentId,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'my-documents',
            position: 'top',
            label: document.string.MyDocuments,
            icon: document.icon.Document,
            component: document.component.MyDocuments
          },
          {
            id: 'library',
            position: 'top',
            label: document.string.Library,
            icon: document.icon.Library,
            component: document.component.Documents
          }
        ],
        spaces: []
      },
      navHeaderComponent: document.component.NewDocumentHeader
    },
    document.app.Documents
  )

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectFactory, {
    component: document.component.CreateDocument
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectPanel, {
    component: document.component.EditDoc
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: document.class.Document,
      descriptor: view.viewlet.Table,
      config: [
        '',
        {
          key: '',
          presenter: document.component.Version,
          label: document.string.Version
        },
        'comments',
        'attachments',
        {
          key: '',
          presenter: tags.component.TagsPresenter,
          label: document.string.Labels,
          sortingKey: 'labels',
          props: {
            _class: document.class.Document,
            key: 'labels',
            icon: document.icon.Document
          }
        },
        'modifiedOn'
      ],
      options: {
        lookup: {
          _id: {
            versions: document.class.DocumentVersion
          }
        }
      }
    },
    document.viewlet.TableDocument
  )

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectEditor, {
    editor: document.component.EditDoc
  })

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: document.component.DocumentPresenter
  })
  builder.mixin(document.class.DocumentVersion, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: document.component.DocumentVersionPresenter
  })

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: document.icon.Document,
      label: document.string.SearchDocument,
      query: document.completion.DocumentQuery
    },
    document.completion.DocumentQueryCategory
  )

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
  builder.mixin(document.class.DocumentVersion, core.class.Class, view.mixin.CollectionEditor, {
    editor: document.component.DocumentVersions
  })
}
