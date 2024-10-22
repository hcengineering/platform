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

import documentsPlugin, {
  documentsId,
  type Document,
  type DocumentSpace,
  DocumentState
} from '@hcengineering/controlled-documents'
import activity from '@hcengineering/activity'
import contact from '@hcengineering/contact'
import { type Builder } from '@hcengineering/model'
import chunter from '@hcengineering/model-chunter'
import core from '@hcengineering/model-core'
import request from '@hcengineering/model-request'
import tracker from '@hcengineering/model-tracker'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import view, { classPresenter, createAction } from '@hcengineering/model-view'
import presentation from '@hcengineering/model-presentation'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import setting from '@hcengineering/setting'
import tags from '@hcengineering/tags'
import print from '@hcengineering/model-print'
import textEditor from '@hcengineering/text-editor'

import documents from './plugin'
import { definePermissions } from './permissions'
import {
  TDocumentSpace,
  TDocumentSpaceType,
  TDocumentSpaceTypeDescriptor,
  TExternalSpace,
  TOrgSpace,
  TDocumentMeta,
  TProjectDocument,
  TProjectMeta,
  TProject,
  TDocument,
  TDocumentSnapshot,
  TControlledDocumentSnapshot,
  THierarchyDocument,
  TDocumentTemplate,
  TDocumentTraining,
  TDocumentCategory,
  TControlledDocument,
  TChangeControl,
  TSequence,
  TDocumentRequest,
  TDocumentReviewRequest,
  TDocumentApprovalRequest,
  TTypeDocumentState,
  TTypeControlledDocumentState,
  TDocumentComment
} from './types'
import { defineSpaceType } from './spaceType'

export { documentsId } from '@hcengineering/controlled-documents/src/index'
export * from './types'

export function createModel (builder: Builder): void {
  builder.createModel(
    TDocumentSpace,
    TDocumentSpaceType,
    TDocumentSpaceTypeDescriptor,
    TExternalSpace,
    TOrgSpace,
    TProject,
    TDocumentMeta,
    TProjectDocument,
    TProjectMeta,
    TDocument,
    TDocumentSnapshot,
    TControlledDocumentSnapshot,
    THierarchyDocument,
    TDocumentTemplate,
    TDocumentTraining,
    TDocumentCategory,
    TControlledDocument,
    TChangeControl,
    TSequence,

    TDocumentRequest,
    TDocumentReviewRequest,
    TDocumentApprovalRequest,

    TTypeDocumentState,
    TTypeControlledDocumentState,

    TDocumentComment
  )

  builder.mixin(documents.class.ControlledDocument, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: documents.function.ControlledDocumentTitleProvider
  })

  builder.mixin(documents.class.DocumentApprovalRequest, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: documents.component.DocumentApprovalRequestPresenter
  })

  builder.mixin(documents.class.DocumentReviewRequest, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: documents.component.DocumentReviewRequestPresenter
  })

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: documents.class.DocumentApprovalRequest,
    action: 'create',
    icon: documents.icon.Document
  })

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: documents.class.DocumentReviewRequest,
    action: 'create',
    icon: documents.icon.Document
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: documents.string.DocumentApplication,
      icon: documents.icon.DocumentApplication,
      locationResolver: documents.resolver.Location,
      alias: documentsId,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'my-documents',
            position: 'top',
            label: documents.string.MyDocuments,
            icon: documents.icon.Document,
            component: documents.component.MyDocuments,
            componentProps: {
              query: {
                [documents.mixin.DocumentTemplate]: { $exists: false }
              },
              config: [
                ['inProgress', documents.string.InProgress, {}],
                ['effective', documents.string.Effective, {}],
                ['archived', documents.string.Archived, {}],
                ['all', documents.string.All, {}]
              ]
            }
          },
          {
            id: 'library',
            position: 'top',
            label: documents.string.Library,
            icon: documents.icon.Library,
            component: documents.component.DocumentsContainer,
            componentProps: {
              query: {
                [documents.mixin.DocumentTemplate]: { $exists: false }
              },
              icon: documents.icon.Library,
              title: documents.string.Documents,
              config: [
                ['effective', documents.string.Effective, {}],
                ['inProgress', documents.string.InProgress, {}],
                ['archived', documents.string.Archived, {}],
                ['all', documents.string.All, {}]
              ]
            }
          },
          {
            id: 'templates',
            position: 'top',
            label: documents.string.DocumentTemplates,
            icon: documents.icon.Library,
            component: documents.component.DocumentTemplates
          },
          {
            id: 'categories',
            position: 'top',
            label: documents.string.Categories,
            icon: documents.icon.Library,
            component: documents.component.Categories,
            componentProps: {
              space: documents.space.QualityDocuments
            }
          }
        ],
        spaces: [
          {
            id: 'orgspaces',
            label: documents.string.GeneralDocumentation,
            spaceClass: documents.class.OrgSpace,
            addSpaceLabel: documents.string.CreateOrgSpace,
            createComponent: documents.component.CreateDocumentsSpace,
            specials: [
              {
                id: 'projects',
                label: documents.string.Projects,
                icon: documents.icon.Document,
                component: documents.component.Projects
              }
            ]
          },
          {
            id: 'projectspaces',
            label: documents.string.TechnicalDocumentation,
            spaceClass: documents.class.ExternalSpace,
            specials: [
              {
                id: 'projects',
                label: documents.string.Projects,
                icon: documents.icon.Document,
                component: documents.component.Projects
              }
            ]
          }
        ]
      },
      navHeaderComponent: documents.component.NewDocumentHeader
    },
    documents.app.Documents
  )

  // Workflow
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: documents.class.Document,
      descriptor: view.viewlet.Table,
      configOptions: {
        sortable: true,
        strict: true
      },
      config: [
        {
          key: '',
          label: documents.string.ID,
          presenter: documents.component.DocumentPresenter,
          props: { isGray: true }
        },
        { key: '', label: documents.string.Title, presenter: documents.component.TitlePresenter },
        {
          key: '',
          label: documents.string.Status,
          presenter: documents.component.StatePresenter,
          sortingKey: 'state'
        },
        { key: '', label: documents.string.Version, presenter: documents.component.DocumentVersionPresenter },
        { key: 'space', sortingKey: 'space' },
        { key: '$lookup.category.title', label: documents.string.Category, sortingKey: '$lookup.category.title' },
        { key: '$lookup.template', label: documents.string.Template, presenter: documents.component.DocumentPresenter },
        {
          key: '$lookup.template',
          label: documents.string.TemplateVersion,
          presenter: documents.component.DocumentVersionPresenter
        },
        {
          key: '$lookup.owner',
          label: documents.string.Owner,
          presenter: documents.component.OwnerPresenter,
          props: { shouldShowLabel: true, isEditable: false },
          sortingKey: '$lookup.owner.name'
        },
        {
          key: '',
          presenter: tags.component.TagsPresenter,
          label: documents.string.Labels,
          sortingKey: 'labels',
          props: {
            _class: documents.class.Document,
            key: 'labels'
          }
        },
        'modifiedOn'
      ],
      options: {
        lookup: {
          owner: contact.mixin.Employee,
          category: documents.class.DocumentCategory,
          template: documents.mixin.DocumentTemplate
        }
      }
    },
    documents.viewlet.TableDocument
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: documents.mixin.DocumentTemplate,
      descriptor: view.viewlet.Table,
      config: [
        {
          key: '',
          label: documents.string.ID,
          presenter: documents.component.DocumentPresenter,
          props: { isGray: true }
        },
        'title',
        {
          key: '',
          label: documents.string.Status,
          presenter: documents.component.StatePresenter
        },
        { key: '', label: documents.string.Version, presenter: documents.component.DocumentVersionPresenter },
        'docPrefix',
        { key: '$lookup.category.title', label: documents.string.Category, sortingKey: '$lookup.category.title' },
        {
          key: '',
          presenter: tags.component.TagsPresenter,
          label: documents.string.Labels,
          sortingKey: 'labels',
          props: {
            _class: documents.class.Document,
            key: 'labels',
            icon: documents.icon.Document
          }
        },
        {
          key: '$lookup.owner',
          label: documents.string.Owner,
          presenter: documents.component.OwnerPresenter,
          props: { shouldShowLabel: true, isEditable: false },
          sortingKey: '$lookup.owner.name'
        }
      ],
      baseQuery: {
        hidden: { $ne: true }
      },
      configOptions: {
        hiddenKeys: ['attachedTo']
      },
      options: {
        lookup: {
          owner: contact.mixin.Employee,
          category: documents.class.DocumentCategory
        }
      }
    },
    documents.viewlet.TableDocumentTemplate
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: documents.class.DocumentCategory,
      descriptor: view.viewlet.Table,
      config: ['', 'title', 'attachments', 'modifiedOn'],
      configOptions: {
        hiddenKeys: ['description']
      },
      options: {}
    },
    documents.viewlet.TableDocumentDomain
  )

  builder.mixin(documents.class.Document, core.class.Class, view.mixin.ObjectFactory, {
    component: documents.component.CreateDocument
  })

  builder.mixin(documents.class.Document, core.class.Class, view.mixin.ObjectEditor, {
    editor: documents.component.EditDoc
  })

  builder.mixin(documents.class.Document, core.class.Class, view.mixin.ObjectPanel, {
    component: documents.component.EditDoc
  })

  builder.mixin(documents.class.ProjectDocument, core.class.Class, view.mixin.ObjectEditor, {
    editor: documents.component.EditProjectDoc
  })

  builder.mixin(documents.class.ProjectDocument, core.class.Class, view.mixin.ObjectPanel, {
    component: documents.component.EditProjectDoc
  })

  builder.mixin(documents.class.ControlledDocument, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.NewRelatedIssue]
  })

  builder.mixin(documents.class.DocumentMeta, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: documents.component.DocumentMetaPresenter
  })

  builder.mixin(documents.class.DocumentMeta, core.class.Class, view.mixin.LinkProvider, {
    encode: documents.function.GetDocumentMetaLinkFragment
  })

  builder.mixin(documents.class.Document, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: documents.component.DocumentPresenter
  })

  builder.mixin(documents.class.Document, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: documentsPlugin.component.ChangeOwnerPopup,
        fillProps: {
          _object: 'object'
        }
      },
      visibilityTester: documentsPlugin.function.CanChangeDocumentOwner,
      label: documentsPlugin.string.ChangeOwner,
      icon: contact.icon.Person,
      category: view.category.General,
      input: 'none',
      target: documents.class.Document,
      context: { mode: ['context'], group: 'edit' }
    },
    documentsPlugin.action.ChangeDocumentOwner
  )

  createAction<Document>(
    builder,
    {
      action: documents.actionImpl.CreateChildDocument,
      label: documentsPlugin.string.CreateChildDocument,
      icon: documents.icon.NewDocument,
      category: view.category.General,
      input: 'focus', // should only work for one document, not bulk
      query: {
        space: { $ne: documents.space.UnsortedTemplates }
      },
      target: documents.class.ProjectDocument,
      visibilityTester: documents.function.CanCreateChildDocument,
      context: { mode: ['context'], group: 'create' }
    },
    documentsPlugin.action.CreateChildDocument
  )

  createAction<Document>(
    builder,
    {
      action: documents.actionImpl.CreateChildTemplate,
      label: documentsPlugin.string.CreateChildTemplate,
      icon: documents.icon.NewDocument,
      category: view.category.General,
      input: 'focus', // should only work for one document, not bulk
      target: documents.class.ProjectDocument,
      visibilityTester: documents.function.CanCreateChildTemplate,
      context: { mode: ['context'], group: 'create' }
    },
    documentsPlugin.action.CreateChildTemplate
  )

  createAction<DocumentSpace>(
    builder,
    {
      action: documents.actionImpl.CreateDocument,
      label: documentsPlugin.string.CreateDocument,
      icon: documents.icon.NewDocument,
      category: view.category.General,
      input: 'none',
      target: documents.class.DocumentSpace,
      visibilityTester: documents.function.CanCreateDocument,
      context: { mode: ['context'], group: 'create' }
    },
    documentsPlugin.action.CreateDocument
  )

  createAction<DocumentSpace>(
    builder,
    {
      action: documents.actionImpl.CreateTemplate,
      label: documentsPlugin.string.CreateTemplate,
      icon: documents.icon.NewDocument,
      category: view.category.General,
      input: 'none',
      target: documents.class.OrgSpace,
      visibilityTester: documents.function.CanCreateTemplate,
      context: { mode: ['context'], group: 'create' }
    },
    documentsPlugin.action.CreateTemplate
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: documentsPlugin.component.DeleteCategoryPopup,
        fillProps: {
          _object: 'object'
        }
      },
      visibilityTester: documentsPlugin.function.CanDeleteDocumentCategory,
      label: view.string.Delete,
      icon: view.icon.Delete,
      category: view.category.General,
      input: 'none',
      target: documents.class.DocumentCategory,
      context: { mode: ['context', 'browser'], group: 'remove' }
    },
    documentsPlugin.action.DeleteDocumentCategory
  )

  builder.mixin(documents.class.DocumentCategory, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: documents.class.DocumentCategory,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.mixin(documents.class.DocumentCategory, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: documents.component.CategoryPresenter
  })

  builder.mixin(documents.class.DocumentCategory, core.class.Class, view.mixin.AttributePresenter, {
    presenter: documents.component.CategoryPresenter
  })

  builder.mixin(documents.class.DocumentCategory, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: documents.component.CategoryPresenter
  })

  builder.mixin(documents.class.DocumentCategory, core.class.Class, view.mixin.ClassFilters, {
    filters: ['code', 'title', 'modifiedOn']
  })

  builder.mixin(documents.class.DocumentCategory, core.class.Class, view.mixin.ObjectEditor, {
    editor: documents.component.EditDocumentCategory
  })

  builder.mixin(documents.class.DocumentCategory, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  builder.mixin(documents.class.TypeDocumentState, core.class.Class, view.mixin.SortFuncs, {
    func: documents.function.DocumentStateSort
  })

  builder.mixin(documents.class.TypeDocumentState, core.class.Class, view.mixin.AllValuesFunc, {
    func: documents.function.GetAllDocumentStates
  })

  builder.createDoc(core.class.FullTextSearchContext, core.space.Model, {
    toClass: documents.class.Document,
    fullTextSummary: true,
    childProcessingAllowed: true
  })

  builder.mixin(documents.class.Document, core.class.Class, view.mixin.ClassFilters, {
    filters: [
      'prefix',
      'title',
      'state',
      'space',
      'template',
      'owner',
      'category',
      'modifiedOn',
      'labels',
      'major',
      'minor',
      'author'
    ],
    getVisibleFilters: documents.function.GetVisibleFilters
  })

  builder.mixin(documents.class.TypeDocumentState, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: documents.component.StateFilterValuePresenter
  })

  builder.mixin(documents.class.TypeDocumentState, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  builder.mixin(documents.class.TypeControlledDocumentState, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: documents.component.ControlledStateFilterValuePresenter
  })

  builder.mixin(documents.class.TypeControlledDocumentState, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  builder.mixin(documents.mixin.DocumentTemplate, core.class.Class, view.mixin.ClassFilters, {
    filters: ['prefix', 'title', 'modifiedOn', 'category']
  })

  builder.mixin(documents.class.Document, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  classPresenter(builder, documents.class.TypeDocumentState, documents.component.StatePresenter)
  classPresenter(builder, documents.class.TypeControlledDocumentState, documents.component.StatePresenter)

  // DocumentReviewRequest
  builder.mixin(documents.class.DocumentReviewRequest, core.class.Class, view.mixin.ObjectEditor, {
    editor: documents.component.DocumentReviewRequest
  })

  builder.mixin(documents.class.DocumentReviewRequest, core.class.Class, request.mixin.RequestPresenter, {
    presenter: documents.component.DocumentReviewRequestPresenter
  })

  builder.mixin(documents.class.DocumentReviewRequest, core.class.Class, view.mixin.ObjectPanel, {
    component: documents.component.DocumentReviewRequest
  })

  builder.mixin(
    documents.class.DocumentReviewRequest,
    core.class.Class,
    notification.mixin.NotificationObjectPresenter,
    {
      presenter: documents.component.DocumentReviewRequestPresenter
    }
  )

  // DocumentApprovalRequest
  builder.mixin(documents.class.DocumentApprovalRequest, core.class.Class, view.mixin.ObjectEditor, {
    editor: documents.component.DocumentApprovalRequest
  })

  builder.mixin(documents.class.DocumentApprovalRequest, core.class.Class, request.mixin.RequestPresenter, {
    presenter: documents.component.DocumentApprovalRequestPresenter
  })

  builder.mixin(documents.class.DocumentApprovalRequest, core.class.Class, view.mixin.ObjectPanel, {
    component: documents.component.DocumentApprovalRequest
  })

  builder.mixin(
    documents.class.DocumentApprovalRequest,
    core.class.Class,
    notification.mixin.NotificationObjectPresenter,
    {
      presenter: documents.component.DocumentApprovalRequestPresenter
    }
  )

  builder.mixin(documents.class.DocumentSpace, core.class.Class, view.mixin.IgnoreActions, {
    actions: [tracker.action.EditRelatedTargets]
  })

  builder.mixin(documents.class.DocumentSpace, core.class.Class, view.mixin.SpacePresenter, {
    presenter: documents.component.DocumentSpacePresenter
  })

  builder.mixin(documents.class.OrgSpace, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Archive]
  })

  builder.mixin(documents.class.Project, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: documents.component.ProjectPresenter
  })

  builder.mixin(documents.class.Project, core.class.Class, view.mixin.AttributePresenter, {
    presenter: documents.component.ProjectRefPresenter
  })

  builder.mixin(documents.class.Project, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete, view.action.Open, view.action.OpenInNewTab, tracker.action.NewRelatedIssue]
  })

  builder.mixin(documents.class.ProjectDocument, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete, tracker.action.NewRelatedIssue]
  })

  builder.mixin(documents.class.Document, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: documents.function.DocumentIdentifierProvider
  })

  createAction(
    builder,
    {
      action: documents.actionImpl.DeleteDocument,
      label: view.string.Delete,
      icon: view.icon.Delete,
      input: 'any',
      category: view.category.General,
      target: documents.class.Document,
      visibilityTester: documents.function.CanDeleteDocument,
      query: {
        state: DocumentState.Draft
      },
      context: {
        mode: ['context', 'browser'],
        group: 'remove'
      }
    },
    documents.action.DeleteDocument
  )

  createAction(
    builder,
    {
      action: documents.actionImpl.ArchiveDocument,
      label: view.string.Archive,
      icon: view.icon.Archive,
      input: 'any',
      category: view.category.General,
      target: documents.class.Document,
      visibilityTester: documents.function.CanArchiveDocument,
      query: {
        state: DocumentState.Effective
      },
      context: {
        mode: ['context', 'browser'],
        group: 'remove'
      }
    },
    documents.action.ArchiveDocument
  )

  createAction(
    builder,
    {
      action: documents.actionImpl.EditDocSpace,
      label: documents.string.EditDocumentSpace,
      icon: view.icon.Edit,
      input: 'focus',
      category: documents.category.Document,
      target: documents.class.DocumentSpace,
      visibilityTester: view.function.CanEditSpace,
      query: {},
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    documents.action.EditDocSpace
  )

  createAction(
    builder,
    {
      action: print.actionImpl.Print,
      actionProps: {
        signed: true
      },
      label: print.string.PrintToPDF,
      icon: print.icon.Print,
      category: view.category.General,
      input: 'focus', // NOTE: should only work for one doc for now, not bulk
      target: documents.class.Document,
      context: { mode: ['context', 'browser'], group: 'tools' },
      visibilityTester: print.function.CanPrint,
      override: [print.action.Print]
    },
    documents.action.Print
  )

  defineSpaceType(builder)
  definePermissions(builder)
  defineNotifications(builder)
  defineSearch(builder)
  defineTextActions(builder)
}

export function defineNotifications (builder: Builder): void {
  builder.mixin(documents.class.ControlledDocument, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: documents.class.DocumentComment,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.mixin(documents.class.ControlledDocument, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['author', 'owner', 'reviewers', 'approvers', 'coAuthors']
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: documents.string.DocumentApplication,
      icon: documents.icon.DocumentApplication
    },
    documents.notification.DocumentsNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      allowedForAuthor: false,
      label: documents.string.Document,
      group: documents.notification.DocumentsNotificationGroup,
      field: 'content',
      txClasses: [core.class.TxUpdateDoc],
      objectClass: documents.class.ControlledDocument,
      defaultEnabled: false,
      templates: {
        textTemplate: '{body}',
        htmlTemplate: '<p>{body}</p>',
        subjectTemplate: '{title}'
      }
    },
    documents.notification.ContentNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      allowedForAuthor: false,
      label: documents.string.Status,
      group: documents.notification.DocumentsNotificationGroup,
      field: 'state',
      txClasses: [core.class.TxUpdateDoc],
      objectClass: documents.class.ControlledDocument,
      defaultEnabled: false,
      templates: {
        textTemplate: '{sender} changed {doc} status',
        htmlTemplate: '<p>{sender} changed {doc} status</p>',
        subjectTemplate: '{doc} status changed'
      }
    },
    documents.notification.StateNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      allowedForAuthor: false,
      label: documents.string.CoAuthors,
      group: documents.notification.DocumentsNotificationGroup,
      field: 'coAuthors',
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      objectClass: documents.class.ControlledDocument,
      defaultEnabled: true,
      templates: {
        textTemplate: '{sender} assigned you as a co-author of {doc}',
        htmlTemplate: '<p>{sender} assigned you as a co-author of {doc}</p>',
        subjectTemplate: 'Co-authoring assignment for {doc}'
      }
    },
    documents.notification.CoAuthorsNotification
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.InboxNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [documents.notification.StateNotification, documents.notification.ContentNotification]
  })

  generateClassNotificationTypes(
    builder,
    documents.class.ControlledDocument,
    documents.notification.DocumentsNotificationGroup,
    [
      'state',
      'code',
      'prefix',
      'seqNumber',
      'major',
      'minor',
      'category',
      'author',
      'content',
      'labels',
      'abstract',
      'snapshots',
      'requests',
      'reviewInterval',
      'controlledState',
      'effectiveDate',
      'plannedEffectiveDate',
      'changeControl',
      'coAuthors'
    ],
    ['owner', 'comments', 'reviewers', 'approvers']
  )
}

export function defineSearch (builder: Builder): void {
  builder.createDoc(core.class.FullTextSearchContext, core.space.Model, {
    toClass: documents.class.Document,
    parentPropagate: true
  })

  builder.createDoc(core.class.FullTextSearchContext, core.space.Model, {
    toClass: documents.class.DocumentMeta,
    fullTextSummary: true,
    childProcessingAllowed: true,
    propagate: []
  })

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      title: documents.string.Documents,
      icon: documents.icon.Document,
      label: documents.string.SearchDocument,
      query: documents.completion.DocumentMetaQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: documents.class.DocumentMeta,
      priority: 800
    },
    documents.completion.DocumentMetaCategory
  )
}

export function defineTextActions (builder: Builder): void {
  // Comment category
  builder.createDoc(textEditor.class.TextEditorAction, core.space.Model, {
    action: documents.function.Comment,
    icon: chunter.icon.Chunter,
    visibilityTester: documents.function.IsCommentVisible,
    label: chunter.string.Message,
    category: 100,
    index: 5
  })
}

export { documentsOperation } from './migration'
export { documents as default }
