//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import {
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type DomainParams,
  type DomainRequestOptions,
  type DomainResult,
  type FindOptions,
  type FindResult,
  type Mixin,
  type OperationDomain,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type Tx,
  type TxResult,
  type WithLookup,
  type WorkspaceDataId,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { Asset, IntlString, Metadata, Plugin, StatusCode } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { type ComponentExtensionId } from '@hcengineering/ui/src/types'
import { type UploadConfig } from './file'
import { type PresentationMiddlewareFactory } from './pipeline'
import type { PreviewConfig } from './preview'
import {
  type ComponentPointExtension,
  type DocCreateExtension,
  type DocRules,
  type FilePreviewExtension,
  type InstantTransactions,
  type ObjectSearchCategory
} from './types'

/**
 * @public
 */
export const presentationId = 'presentation' as Plugin

/**
 * @public
 */
export interface ClientHook {
  findAll: <T extends Doc>(
    client: Client,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>

  findOne: <T extends Doc>(
    client: Client,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<WithLookup<T> | undefined>

  domainRequest: <T>(
    client: Client,
    domain: OperationDomain,
    params: DomainParams,
    options?: DomainRequestOptions
  ) => Promise<DomainResult<T>>

  tx: (client: Client, tx: Tx) => Promise<TxResult>

  searchFulltext: (client: Client, query: SearchQuery, options: SearchOptions) => Promise<SearchResult>
}

export default plugin(presentationId, {
  class: {
    ObjectSearchCategory: '' as Ref<Class<ObjectSearchCategory>>,
    PresentationMiddlewareFactory: '' as Ref<Class<PresentationMiddlewareFactory>>,
    ComponentPointExtension: '' as Ref<Class<ComponentPointExtension>>,
    DocCreateExtension: '' as Ref<Class<DocCreateExtension>>,
    DocRules: '' as Ref<Class<DocRules>>,
    FilePreviewExtension: '' as Ref<Class<FilePreviewExtension>>
  },
  mixin: {
    InstantTransactions: '' as Ref<Mixin<InstantTransactions>>
  },
  string: {
    Create: '' as IntlString,
    Cancel: '' as IntlString,
    Ok: '' as IntlString,
    Save: '' as IntlString,
    Saved: '' as IntlString,
    Download: '' as IntlString,
    DownloadOriginal: '' as IntlString,
    Delete: '' as IntlString,
    Close: '' as IntlString,
    NotSelected: '' as IntlString,
    Deselect: '' as IntlString,
    Archived: '' as IntlString,
    AddSocialLinks: '' as IntlString,
    EditSocialLinks: '' as IntlString,
    Change: '' as IntlString,
    Remove: '' as IntlString,
    Search: '' as IntlString,
    Spaces: '' as IntlString,
    NumberMembers: '' as IntlString,
    NumberSpaces: '' as IntlString,
    InThis: '' as IntlString,
    NoMatchesInThis: '' as IntlString,
    NoMatchesFound: '' as IntlString,
    NotInThis: '' as IntlString,
    Match: '' as IntlString,
    Add: '' as IntlString,
    Edit: '' as IntlString,
    DocumentPreview: '' as IntlString,
    MakePrivate: '' as IntlString,
    MakePrivateDescription: '' as IntlString,
    OpenInANewTab: '' as IntlString,
    Created: '' as IntlString,
    Selected: '' as IntlString,
    NoResults: '' as IntlString,
    Next: '' as IntlString,
    FailedToPreview: '' as IntlString,
    ContentType: '' as IntlString,
    ContentTypeNotSupported: '' as IntlString,
    StartDrawing: '' as IntlString,
    DrawingHistory: '' as IntlString,
    ColorAdd: '' as IntlString,
    ColorRemove: '' as IntlString,
    ColorReset: '' as IntlString,
    Copy: '' as IntlString,
    DocumentUrlCopied: '' as IntlString,
    CopyLink: '' as IntlString,
    UnableToFollowMention: '' as IntlString,
    AccessDenied: '' as IntlString,
    Undo: '' as IntlString,
    Redo: '' as IntlString,
    ClearCanvas: '' as IntlString,
    PenTool: '' as IntlString,
    EraserTool: '' as IntlString,
    PanTool: '' as IntlString,
    TextTool: '' as IntlString,
    PaletteManagementMenu: '' as IntlString
  },
  extension: {
    FilePreviewExtension: '' as ComponentExtensionId,
    FilePreviewPopupActions: '' as ComponentExtensionId
  },
  metadata: {
    ModelVersion: '' as Metadata<string>,
    FrontVersion: '' as Metadata<string>,
    Draft: '' as Metadata<Record<string, any>>,
    UploadURL: '' as Metadata<string>,
    FilesURL: '' as Metadata<string>,
    CollaboratorUrl: '' as Metadata<string>,
    Token: '' as Metadata<string>,
    Endpoint: '' as Metadata<string>,
    WorkspaceUuid: '' as Metadata<WorkspaceUuid>,
    WorkspaceDataId: '' as Metadata<WorkspaceDataId>,
    FrontUrl: '' as Asset,
    LinkPreviewUrl: '' as Metadata<string>,
    UploadConfig: '' as Metadata<UploadConfig>,
    PreviewConfig: '' as Metadata<PreviewConfig | undefined>,
    ClientHook: '' as Metadata<ClientHook>,
    SessionId: '' as Metadata<string>,
    StatsUrl: '' as Metadata<string>,
    MailUrl: '' as Metadata<string>,
    PreviewUrl: '' as Metadata<string>,
    PulseUrl: '' as Metadata<string>
  },
  status: {
    FileTooLarge: '' as StatusCode
  }
})
