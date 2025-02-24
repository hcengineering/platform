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
import documents, {
  type Document,
  type DocumentState,
  type DocumentSpace,
  documentsId
} from '@hcengineering/controlled-documents'
import { type Client, type Doc, type Ref, type Space } from '@hcengineering/core'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { type AnyComponent, type Location } from '@hcengineering/ui/src/types'
import type { KeyFilter, SortFunc, ViewActionAvailabilityFunction } from '@hcengineering/view'

export default mergeIds(documentsId, documents, {
  component: {
    MyDocuments: '' as AnyComponent,
    NewDocumentHeader: '' as AnyComponent,
    DocumentSpacePresenter: '' as AnyComponent,
    ProjectPresenter: '' as AnyComponent,
    ProjectRefPresenter: '' as AnyComponent,
    Revision: '' as AnyComponent,

    // New model components
    EditDocumentCategory: '' as AnyComponent,

    DocumentReviewRequest: '' as AnyComponent,
    DocumentReviewRequestPresenter: '' as AnyComponent,

    DocumentApprovalRequest: '' as AnyComponent,
    DocumentApprovalRequestPresenter: '' as AnyComponent,

    CreateDocumentsSpace: '' as AnyComponent,
    CreateDocumentSpaceType: '' as AnyComponent
  },
  string: {
    ID: '' as IntlString,
    ValidationWorkflow: '' as IntlString,
    Cancel: '' as IntlString,
    NewDocumentDialogClose: '' as IntlString,
    NewDocumentCloseNote: '' as IntlString,
    CreateDocumentCategory: '' as IntlString,
    DocumentCategoryCreateLabel: '' as IntlString,
    DocumentCategoryAlreadyExists: '' as IntlString,
    DocumentCategoryCodeAlreadyExists: '' as IntlString,
    EditorPlaceholder: '' as IntlString,
    TemplateVersion: '' as IntlString,
    VersionValue: '' as IntlString,
    SearchDocument: '' as IntlString,
    TemplateName: '' as IntlString,
    DocumentApplication: '' as IntlString,
    MyDocuments: '' as IntlString,
    Library: '' as IntlString,
    ViewMode: '' as IntlString,
    EditMode: '' as IntlString,
    ComparisonMode: '' as IntlString,
    Compare: '' as IntlString,
    Against: '' as IntlString,
    ComparisonModeNotSupported: '' as IntlString,
    CreateDraft: '' as IntlString,
    SendForApproval: '' as IntlString,
    SendForReview: '' as IntlString,
    CompleteReview: '' as IntlString,
    Requests: '' as IntlString,
    Approve: '' as IntlString,
    Reject: '' as IntlString,
    DocumentTemplates: '' as IntlString,
    DocumentCode: '' as IntlString,
    TemplateCode: '' as IntlString,
    DocumentPrefix: '' as IntlString,
    DocumentCodePlaceholder: '' as IntlString,
    DocumentPrefixPlaceholder: '' as IntlString,
    DocumentTemplateCreateLabel: '' as IntlString,
    DomainTitle: '' as IntlString,
    MetaAbstract: '' as IntlString,

    ContentTab: '' as IntlString,
    TeamTab: '' as IntlString,
    MetaTab: '' as IntlString,
    ChangeControlTab: '' as IntlString,
    ReleaseTab: '' as IntlString,
    HistoryTab: '' as IntlString,

    ModificationDate: '' as IntlString,
    Modified: '' as IntlString,
    AssignedTo: '' as IntlString,
    Unassigned: '' as IntlString,
    Untitled: '' as IntlString,
    Copy: '' as IntlString,

    AccessWorkarea: '' as IntlString,
    EffectiveLibrary: '' as IntlString,
    WorkingLibrary: '' as IntlString,
    CreateDraftQmsDocuments: '' as IntlString,
    OwnDocumentAskReviewGetApproval: '' as IntlString,
    ApproveDocuments: '' as IntlString,
    ReassignOwnershipToAnotherUser: '' as IntlString,
    MakeDocumentEffective: '' as IntlString,
    CreateDraftQmsTemplates: '' as IntlString,

    SelectReviewers: '' as IntlString,
    SelectApprovers: '' as IntlString,
    RequestsToReviewTheDoc: '' as IntlString,
    RequestsToApproveTheDoc: '' as IntlString,

    ConfirmApproval: '' as IntlString,
    ConfirmRejection: '' as IntlString,
    ConfirmApprovalSubmission: '' as IntlString,
    ProvideRejectionReason: '' as IntlString,
    RejectionReason: '' as IntlString,
    ConfirmReviewCompletion: '' as IntlString,
    ConfirmReviewSubmission: '' as IntlString,
    AddApprovalTitle: '' as IntlString,
    AddApprovalDescription1: '' as IntlString,
    AddApprovalDescription2: '' as IntlString,
    AddApprovalDescription3: '' as IntlString,
    AddApprovalDescription4: '' as IntlString,
    NoApprovalsDescription: '' as IntlString,
    CurrentVersion: '' as IntlString,

    NewDocument: '' as IntlString,
    NewDocumentCategory: '' as IntlString,
    NewDocumentTemplate: '' as IntlString,

    LocationStepTitle: '' as IntlString,
    TemplateStepTitle: '' as IntlString,
    InfoStepTitle: '' as IntlString,
    TeamStepTitle: '' as IntlString,

    TitleAndDescr: '' as IntlString,
    AbstractPlaceholder: '' as IntlString,
    NewDocCreation: '' as IntlString,
    NewTemplateCreation: '' as IntlString,
    NewTemplatePlaceholder: '' as IntlString,
    CustomReason: '' as IntlString,
    ReasonPlaceholder: '' as IntlString,

    EditDocument: '' as IntlString,

    Email: '' as IntlString,
    Password: '' as IntlString,
    FieldIsEmpty: '' as IntlString,
    ValidatingCredentials: '' as IntlString,

    EffectiveImmediately: '' as IntlString,
    EffectiveOn: '' as IntlString,

    PeriodicReviewToBeCompleted: '' as IntlString,
    MonthsAfterEffectiveDate: '' as IntlString,
    ToBePassedWithin: '' as IntlString,
    AttemptsAnd: '' as IntlString,
    DaysAfterEffectiveDate: '' as IntlString,

    Space: '' as IntlString,
    SelectParent: '' as IntlString,

    PrefixInUse: '' as IntlString,
    CodeInUse: '' as IntlString,
    ChangeCode: '' as IntlString,
    ChangePrefix: '' as IntlString,

    MarkDocAsDeleted: '' as IntlString,
    MarkDocsAsDeleted: '' as IntlString,
    MarkDocAsDeletedConfirm: '' as IntlString,

    ArchiveDocs: '' as IntlString,
    ArchiveDocsConfirm: '' as IntlString,

    DocumentInHierarchy: '' as IntlString,
    FirstDraftVersion: '' as IntlString,

    EffectiveDocumentLifecycle: '' as IntlString,

    ReasonAndImpact: '' as IntlString,
    DescribeChanges: '' as IntlString,
    DescribeReason: '' as IntlString,
    DescribeImpact: '' as IntlString,
    AddDocument: '' as IntlString,
    NoDocuments: '' as IntlString,

    Reviewer: '' as IntlString,
    Approver: '' as IntlString,

    Name: '' as IntlString,
    ChangeSeverity: '' as IntlString,
    Reference: '' as IntlString,
    History: '' as IntlString,
    Signatories: '' as IntlString,
    Page: '' as IntlString,
    Of: '' as IntlString,
    CreatedFromTemplate: '' as IntlString,

    NewDocumentSpace: '' as IntlString,
    EditDocumentSpace: '' as IntlString,
    DocSpaceDescriptionPlaceholder: '' as IntlString,
    Members: '' as IntlString,
    RoleLabel: '' as IntlString,

    ViewAll: '' as IntlString,
    Readonly: '' as IntlString,

    CreateDocumentFailed: '' as IntlString,
    CreateDocumentTemplateFailed: '' as IntlString,
    TryAgain: '' as IntlString,

    LatestVersionHint: '' as IntlString
  },
  controlledDocStates: {
    Empty: '' as IntlString,
    Approved: '' as IntlString,
    InApproval: '' as IntlString,
    InReview: '' as IntlString,
    Reviewed: '' as IntlString,
    Rejected: '' as IntlString,
    ToReview: '' as IntlString
  },
  function: {
    CanCreateTemplate: '' as Resource<ViewActionAvailabilityFunction<DocumentSpace>>,
    CanCreateDocument: '' as Resource<ViewActionAvailabilityFunction<DocumentSpace>>,
    CanCreateFolder: '' as Resource<ViewActionAvailabilityFunction<DocumentSpace>>,
    CanCreateChildTemplate: '' as Resource<ViewActionAvailabilityFunction<Document>>,
    CanCreateChildDocument: '' as Resource<ViewActionAvailabilityFunction<Document>>,
    CanCreateChildFolder: '' as Resource<ViewActionAvailabilityFunction<Document>>,
    CanRenameFolder: '' as Resource<ViewActionAvailabilityFunction<Document>>,
    CanDeleteFolder: '' as Resource<ViewActionAvailabilityFunction<Document>>,
    CheckIsDocumentCreationDisabled: '' as Resource<() => Promise<boolean>>,
    CheckAreTemplatesDisabled: '' as Resource<() => Promise<boolean>>,
    CheckAreDomainsDisabled: '' as Resource<() => Promise<boolean>>,
    CheckIsLibraryDisabled: '' as Resource<() => Promise<boolean>>,
    DocumentStateSort: '' as SortFunc,
    GetAllDocumentStates: '' as Resource<() => Promise<DocumentState[]>>,
    GetVisibleFilters: '' as Resource<(filters: KeyFilter[], space?: Ref<Space>) => Promise<KeyFilter[]>>,
    GetDocumentMetaLinkFragment: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    GetControlledDocumentLinkFragment: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    CanDeleteDocument: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanArchiveDocument: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanMakeDocumentObsolete: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanOpenDocument: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanPrintDocument: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanTransferDocument: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    ControlledDocumentTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    DocumentMetaTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>
  }
})
