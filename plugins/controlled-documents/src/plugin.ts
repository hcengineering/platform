import {
  type Class,
  type Doc,
  type Mixin,
  type Ref,
  type Type,
  type Space,
  type SpaceTypeDescriptor,
  type Permission,
  Role
} from '@hcengineering/core'
import type { Asset, Plugin, Resource } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import type { AnyComponent, ResolvedLocation, Location } from '@hcengineering/ui'
import { Action } from '@hcengineering/view'

import type {
  ChangeControl,
  ControlledDocument,
  ControlledDocumentState,
  Document,
  DocumentSnapshot,
  DocumentApprovalRequest,
  DocumentCategory,
  DocumentComment,
  DocumentMeta,
  DocumentRequest,
  DocumentReviewRequest,
  DocumentSpace,
  DocumentSpaceType,
  DocumentSpaceTypeDescriptor,
  DocumentState,
  DocumentTemplate,
  DocumentTraining,
  HierarchyDocument,
  ExternalSpace,
  OrgSpace,
  Project,
  ProjectMeta,
  ProjectDocument,
  Sequence,
  ControlledDocumentSnapshot
} from './types'

/**
 * @public
 */
export const documentsId = 'documents' as Plugin

/**
 * @public
 */
export const documentsPlugin = plugin(documentsId, {
  class: {
    DocumentSpace: '' as Ref<Class<DocumentSpace>>,
    DocumentSpaceType: '' as Ref<Class<DocumentSpaceType>>,
    DocumentSpaceTypeDescriptor: '' as Ref<Class<DocumentSpaceTypeDescriptor>>,
    ExternalSpace: '' as Ref<Class<ExternalSpace>>,
    OrgSpace: '' as Ref<Class<OrgSpace>>,
    Project: '' as Ref<Class<Project>>,
    ProjectMeta: '' as Ref<Class<ProjectMeta>>,
    ProjectDocument: '' as Ref<Class<ProjectDocument>>,
    DocumentMeta: '' as Ref<Class<DocumentMeta>>,
    Document: '' as Ref<Class<Document>>,
    DocumentSnapshot: '' as Ref<Class<DocumentSnapshot>>,
    ControlledDocumentSnapshot: '' as Ref<Class<ControlledDocumentSnapshot>>,
    HierarchyDocument: '' as Ref<Class<HierarchyDocument>>,
    DocumentCategory: '' as Ref<Class<DocumentCategory>>,
    ControlledDocument: '' as Ref<Class<ControlledDocument>>,
    ChangeControl: '' as Ref<Class<ChangeControl>>,
    DocumentComment: '' as Ref<Class<DocumentComment>>,

    Sequence: '' as Ref<Class<Sequence>>,

    DocumentRequest: '' as Ref<Class<DocumentRequest>>,
    DocumentReviewRequest: '' as Ref<Class<DocumentReviewRequest>>,
    DocumentApprovalRequest: '' as Ref<Class<DocumentApprovalRequest>>,

    TypeDocumentState: '' as Ref<Class<Type<DocumentState>>>,
    TypeControlledDocumentState: '' as Ref<Class<Type<ControlledDocumentState>>>
  },
  mixin: {
    DocumentTemplate: '' as Ref<Mixin<DocumentTemplate>>,
    DocumentTraining: '' as Ref<Mixin<DocumentTraining>>,
    DocumentSpaceTypeData: '' as Ref<Mixin<DocumentSpace>>
    // DocTemplateActions: '' as Ref<Mixin<DocTemplateActions>>
  },
  component: {
    Documents: '' as AnyComponent,
    DocumentsContainer: '' as AnyComponent,
    CreateDocument: '' as AnyComponent,
    EditDocOwner: '' as AnyComponent,
    QmsDocumentWizard: '' as AnyComponent,
    QmsTemplateWizard: '' as AnyComponent,
    EditDoc: '' as AnyComponent,
    EditProjectDoc: '' as AnyComponent,
    EditDocTemplate: '' as AnyComponent,
    DocumentPresenter: '' as AnyComponent,
    StatePresenter: '' as AnyComponent,
    TitlePresenter: '' as AnyComponent,
    ModificationDatePresenter: '' as AnyComponent,
    OwnerPresenter: '' as AnyComponent,
    AddCommentPopup: '' as AnyComponent,
    DocumentCommentsPopup: '' as AnyComponent,
    ChangeOwnerPopup: '' as AnyComponent,
    DocumentMetaPresenter: '' as AnyComponent,
    DocumentVersionPresenter: '' as AnyComponent,
    DeleteCategoryPopup: '' as AnyComponent,
    DocumentIcon: '' as AnyComponent
  },
  action: {
    ChangeDocumentOwner: '' as Ref<Action<Doc, any>>,
    CreateChildDocument: '' as Ref<Action<Document, any>>,
    CreateChildTemplate: '' as Ref<Action<Document, any>>,
    CreateDocument: '' as Ref<Action<DocumentSpace, any>>,
    CreateTemplate: '' as Ref<Action<DocumentSpace, any>>,
    DeleteDocumentCategory: '' as Ref<Action<Doc, any>>,
    DeleteDocument: '' as Ref<Action>,
    ArchiveDocument: '' as Ref<Action>,
    EditDocSpace: '' as Ref<Action>,
    TransferDocument: '' as Ref<Action>,
    Print: '' as Ref<Action<Doc, { signed: boolean }>>
  },
  function: {
    CanChangeDocumentOwner: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanDeleteDocumentCategory: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>
  },
  icon: {
    Approvals: '' as Asset,
    CheckmarkCircle: '' as Asset,
    DocumentApplication: '' as Asset,
    NewDocument: '' as Asset,
    Document: '' as Asset,
    Library: '' as Asset,
    StateDraft: '' as Asset,
    StateApproved: '' as Asset,
    StateEffective: '' as Asset,
    StateRejected: '' as Asset,
    StateObsolete: '' as Asset,
    ArrowUp: '' as Asset,
    ArrowDown: '' as Asset,
    Configure: '' as Asset
  },
  space: {
    Documents: '' as Ref<Space>,
    QualityDocuments: '' as Ref<OrgSpace>,
    UnsortedTemplates: '' as Ref<DocumentSpace>
  },
  spaceType: {
    DocumentSpaceType: '' as Ref<DocumentSpaceType>
  },
  app: {
    Documents: '' as Ref<Doc>
  },
  string: {
    Document: '' as IntlString,
    Documents: '' as IntlString,
    DocumentTemplate: '' as IntlString,
    Title: '' as IntlString,
    Code: '' as IntlString,
    Number: '' as IntlString,
    Version: '' as IntlString,
    Category: '' as IntlString,
    Author: '' as IntlString,
    Owner: '' as IntlString,
    Status: '' as IntlString,
    Labels: '' as IntlString,
    Description: '' as IntlString,
    Reason: '' as IntlString,
    CollaborativeDocument: '' as IntlString,
    ControlledDocument: '' as IntlString,
    Review: '' as IntlString,
    Approval: '' as IntlString,
    Reviewers: '' as IntlString,
    Approvers: '' as IntlString,
    CoAuthors: '' as IntlString,
    ReviewInterval: '' as IntlString,
    EffectiveDate: '' as IntlString,
    PlannedEffectiveDate: '' as IntlString,
    ChangeControl: '' as IntlString,
    Rank: '' as IntlString,
    DocumentRequest: '' as IntlString,
    DocumentReviewRequest: '' as IntlString,
    DocumentApprovalRequest: '' as IntlString,
    ControlledStatus: '' as IntlString,
    Categories: '' as IntlString,
    Guidance: '' as IntlString,
    Required: '' as IntlString,
    Major: '' as IntlString,
    Minor: '' as IntlString,
    Patch: '' as IntlString,
    AttachmentsMax: '' as IntlString,
    Draft: '' as IntlString,
    Deleted: '' as IntlString,
    Effective: '' as IntlString,
    Archived: '' as IntlString,
    Parent: '' as IntlString,
    Template: '' as IntlString,
    GeneralInfo: '' as IntlString,
    InProgress: '' as IntlString,
    Resolve: '' as IntlString,
    Unresolve: '' as IntlString,
    Pending: '' as IntlString,
    Resolved: '' as IntlString,
    ShowResolved: '' as IntlString,
    Ordering: '' as IntlString,
    SelectOwner: '' as IntlString,
    ChangeOwner: '' as IntlString,
    ChangeOwnerHintBeginning: '' as IntlString,
    ChangeOwnerHintEnd: '' as IntlString,
    ChangeOwnerWarning: '' as IntlString,
    CreateDocument: '' as IntlString,
    CreateTemplate: '' as IntlString,
    DeleteCategory: '' as IntlString,
    DeleteCategoryHint: '' as IntlString,
    DeleteCategoryWarning: '' as IntlString,
    Key: '' as IntlString,
    CommentsSequence: '' as IntlString,
    Index: '' as IntlString,
    GeneralDocumentation: '' as IntlString,
    TechnicalDocumentation: '' as IntlString,
    UnsortedTemplates: '' as IntlString,
    Project: '' as IntlString,
    Projects: '' as IntlString,
    ExternalSpace: '' as IntlString,
    DocumentSpaceType: '' as IntlString,
    Path: '' as IntlString,
    CreateChildDocument: '' as IntlString,
    CreateChildTemplate: '' as IntlString,
    All: '' as IntlString,
    ImpactAnalysis: '' as IntlString,
    ImpactedDocuments: '' as IntlString,
    SysTemplate: '' as IntlString,
    DocumentTrainingDueDays: '' as IntlString,
    DocumentTrainingEnabled: '' as IntlString,
    Own: '' as IntlString,
    Snapshot: '' as IntlString,
    Snapshots: '' as IntlString,
    ControlledSnapshot: '' as IntlString,
    DraftRevision: '' as IntlString,
    CreateNewDraft: '' as IntlString,
    CreateOrgSpace: '' as IntlString,

    ReviewDocumentPermission: '' as IntlString,
    ReviewDocumentDescription: '' as IntlString,
    ApproveDocumentPermission: '' as IntlString,
    ApproveDocumentDescription: '' as IntlString,
    ArchiveDocumentPermission: '' as IntlString,
    ArchiveDocumentDescription: '' as IntlString,
    CoAuthorDocumentPermission: '' as IntlString,
    CoAuthorDocumentDescription: '' as IntlString,
    CreateDocumentPermission: '' as IntlString,
    CreateDocumentDescription: '' as IntlString,
    UpdateDocumentOwnerPermission: '' as IntlString,
    UpdateDocumentOwnerDescription: '' as IntlString,
    CreateDocumentCategoryPermission: '' as IntlString,
    CreateDocumentCategoryDescription: '' as IntlString,
    UpdateDocumentCategoryPermission: '' as IntlString,
    UpdateDocumentCategoryDescription: '' as IntlString,
    DeleteDocumentCategoryPermission: '' as IntlString,
    DeleteDocumentCategoryDescription: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,

    Transfer: '' as IntlString,
    TransferWarning: '' as IntlString,
    TransferDocuments: '' as IntlString,
    TransferDocumentsHint: '' as IntlString
  },
  ids: {
    NoParent: '' as Ref<DocumentMeta>,
    NoProject: '' as Ref<Project>
  },
  sequence: {
    Templates: '' as Ref<Sequence>,
    CcTemplates: '' as Ref<Sequence>,
    EccTemplates: '' as Ref<Sequence>
  },
  category: {
    DOC: '' as Ref<DocumentCategory>,
    VE: '' as Ref<DocumentCategory>,
    CM: '' as Ref<DocumentCategory>,
    CA: '' as Ref<DocumentCategory>,
    CC: '' as Ref<DocumentCategory>
  },
  role: {
    QARA: '' as Ref<Role>,
    Manager: '' as Ref<Role>,
    QualifiedUser: '' as Ref<Role>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  descriptor: {
    DocumentSpaceType: '' as Ref<SpaceTypeDescriptor>
  },
  permission: {
    ReviewDocument: '' as Ref<Permission>,
    ApproveDocument: '' as Ref<Permission>,
    ArchiveDocument: '' as Ref<Permission>,
    CoAuthorDocument: '' as Ref<Permission>,
    CreateDocument: '' as Ref<Permission>,
    UpdateDocumentOwner: '' as Ref<Permission>,
    CreateDocumentCategory: '' as Ref<Permission>,
    UpdateDocumentCategory: '' as Ref<Permission>,
    DeleteDocumentCategory: '' as Ref<Permission>
  },
  template: {
    ProductChangeControl: '' as Ref<DocumentTemplate>
  }
})

export default documentsPlugin
