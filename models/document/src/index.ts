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
import { Document, documentId, DocumentVersion, RichDocumentContent, Step } from '@hcengineering/document'
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
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import view, { actionTemplates, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import tags from '@hcengineering/tags'
import document from './plugin'

export const DOMAIN_DOCUMENT = 'document' as Domain

@Model(document.class.RichDocumentContent, core.class.AttachedDoc, DOMAIN_DOCUMENT)
@UX(document.string.Document)
export class TRichDocumentContent extends TAttachedDoc implements RichDocumentContent {
  steps!: Step[]
  version!: number
}

@Model(document.class.DocumentVersion, core.class.AttachedDoc, DOMAIN_DOCUMENT)
@UX(document.string.Version)
export class TDocumentVersion extends TAttachedDoc implements DocumentVersion {
  @Prop(TypeNumber(), document.string.Version)
  @ReadOnly()
  version!: number

  @Prop(TypeNumber(), document.string.Revision)
  @ReadOnly()
  sequenceNumber!: number

  @Prop(TypeNumber(), document.string.Revision)
  @ReadOnly()
  @Index(IndexKind.FullText)
  content!: Markup

  @Prop(TypeNumber(), document.string.ApprovedBy)
  @ReadOnly()
  approved!: Ref<Employee> | null
}

@Model(document.class.Document, core.class.Doc, DOMAIN_DOCUMENT)
@UX(document.string.Document, document.icon.Document, undefined, 'name')
export class TDocument extends TDoc implements Document {
  @Prop(TypeString(), document.string.Name)
  @Index(IndexKind.FullText)
  name!: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, undefined, attachment.string.Files)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(Collection(tags.class.TagReference), document.string.Labels)
  labels?: number

  @Prop(TypeNumber(), document.string.Revision)
  @ReadOnly()
  @Hidden()
  editSequence!: number

  @Prop(Collection(document.class.DocumentVersion), document.string.Version)
  versions!: number

  @Prop(Collection(document.class.RichDocumentContent), document.string.Document)
  @Hidden()
  content!: number

  @Prop(TypeNumber(), document.string.Version)
  @ReadOnly()
  @Hidden()
  versionCounter!: number

  @Prop(ArrOf(TypeRef(contact.class.Employee)), document.string.Responsible)
  responsible!: Ref<Employee>[]
}

export function createModel (builder: Builder): void {
  builder.createModel(TDocument, TRichDocumentContent, TDocumentVersion)

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

  builder.mixin(document.class.Document, core.class.Class, view.mixin.ClassFilters, {
    filters: ['_class', 'modifiedOn']
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
          presenter: document.component.Status,
          label: document.string.Status
        },
        {
          key: '',
          presenter: document.component.Version,
          label: document.string.Version
        },
        {
          key: '',
          presenter: document.component.Revision,
          label: document.string.Revision
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

  builder.mixin(document.class.Document, core.class.Class, view.mixin.AttributePresenter, {
    presenter: document.component.DocumentPresenter
  })
  builder.mixin(document.class.DocumentVersion, core.class.Class, view.mixin.AttributePresenter, {
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
    target: document.class.Document,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    }
  })
  builder.mixin(document.class.DocumentVersion, core.class.Class, view.mixin.CollectionEditor, {
    editor: document.component.DocumentVersions
  })
}

export { documentOperation } from './migration'
export { document as default }
