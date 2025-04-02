//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { type Blob, type BlobMetadata, type Doc, type Ref } from '@hcengineering/core'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import {
  type FilterFunction,
  type ViewAction,
  type ViewCategoryAction,
  viewId,
  type ViewOptionsAction
} from '@hcengineering/view'
import { type FileOrBlob, type FilePreviewExtension } from '@hcengineering/presentation/src/types'
import { type PresentationMiddlewareFactory } from '@hcengineering/presentation/src/pipeline'
import view from '@hcengineering/view-resources/src/plugin'

export default mergeIds(viewId, view, {
  actionImpl: {
    Archive: '' as ViewAction,
    UnArchive: '' as ViewAction,
    Join: '' as ViewAction,
    Leave: '' as ViewAction,
    Move: '' as ViewAction,
    MoveLeft: '' as ViewAction,
    MoveRight: '' as ViewAction,
    MoveUp: '' as ViewAction,
    MoveDown: '' as ViewAction,

    SelectItem: '' as ViewAction,
    SelectItemAll: '' as ViewAction,
    SelectItemNone: '' as ViewAction,
    SelectUp: '' as ViewAction,
    SelectDown: '' as ViewAction,

    ShowPreview: '' as ViewAction,
    ShowActions: '' as ViewAction,
    Preview: '' as ViewAction,

    Open: '' as ViewAction,
    OpenInNewTab: '' as ViewAction
  },
  component: {
    StringEditor: '' as AnyComponent,
    StringEditorPopup: '' as AnyComponent,
    StringPresenter: '' as AnyComponent,
    HyperlinkPresenter: '' as AnyComponent,
    HyperlinkEditor: '' as AnyComponent,
    HyperlinkEditorPopup: '' as AnyComponent,
    IntlStringPresenter: '' as AnyComponent,
    FileSizePresenter: '' as AnyComponent,
    NumberEditor: '' as AnyComponent,
    NumberPresenter: '' as AnyComponent,
    MarkupDiffPresenter: '' as AnyComponent,
    MarkupPresenter: '' as AnyComponent,
    BooleanPresenter: '' as AnyComponent,
    BooleanEditor: '' as AnyComponent,
    TimestampPresenter: '' as AnyComponent,
    DateEditor: '' as AnyComponent,
    DatePresenter: '' as AnyComponent,
    DateTimePresenter: '' as AnyComponent,
    TableBrowser: '' as AnyComponent,
    RolePresenter: '' as AnyComponent,
    YoutubePresenter: '' as AnyComponent,
    GithubPresenter: '' as AnyComponent,
    ClassPresenter: '' as AnyComponent,
    ClassRefPresenter: '' as AnyComponent,
    EnumEditor: '' as AnyComponent,
    EnumArrayEditor: '' as AnyComponent,
    HTMLEditor: '' as AnyComponent,
    CollaborativeHTMLEditor: '' as AnyComponent,
    CollaborativeDocEditor: '' as AnyComponent,
    MarkupEditor: '' as AnyComponent,
    MarkupEditorPopup: '' as AnyComponent,
    ListView: '' as AnyComponent,
    SpaceRefPresenter: '' as AnyComponent,
    EnumPresenter: '' as AnyComponent,
    StatusPresenter: '' as AnyComponent,
    StatusRefPresenter: '' as AnyComponent,
    PersonArrayEditor: '' as AnyComponent,
    PersonIdFilterValuePresenter: '' as AnyComponent,
    DateFilterPresenter: '' as AnyComponent,
    StringFilterPresenter: '' as AnyComponent,
    AudioViewer: '' as AnyComponent,
    ImageViewer: '' as AnyComponent,
    VideoViewer: '' as AnyComponent,
    PDFViewer: '' as AnyComponent,
    TextViewer: '' as AnyComponent,
    BaseDocPresenter: '' as AnyComponent,
    MasterDetailView: '' as AnyComponent,
    AssociationPresenter: '' as AnyComponent,
    TreeView: '' as AnyComponent
  },
  string: {
    Table: '' as IntlString,
    Role: '' as IntlString,
    // Keybaord actions
    MoveUp: '' as IntlString,
    MoveDown: '' as IntlString,
    MoveLeft: '' as IntlString,
    MoveRight: '' as IntlString,
    SelectItem: '' as IntlString,
    SelectItemAll: '' as IntlString,
    SelectItemNone: '' as IntlString,
    SelectUp: '' as IntlString,
    SelectDown: '' as IntlString,
    ShowPreview: '' as IntlString,
    ShowActions: '' as IntlString,
    // Action categories
    General: '' as IntlString,
    Navigation: '' as IntlString,
    Editor: '' as IntlString,
    MarkdownFormatting: '' as IntlString,
    HideArchived: '' as IntlString
  },
  function: {
    FilterArrayAllResult: '' as FilterFunction,
    FilterArrayAnyResult: '' as FilterFunction,
    FilterObjectInResult: '' as FilterFunction,
    FilterObjectNinResult: '' as FilterFunction,
    FilterValueInResult: '' as FilterFunction,
    FilterValueNinResult: '' as FilterFunction,
    FilterBeforeResult: '' as FilterFunction,
    FilterAfterResult: '' as FilterFunction,
    FilterContainsResult: '' as FilterFunction,
    FilterNestedMatchResult: '' as FilterFunction,
    FilterNestedDontMatchResult: '' as FilterFunction,
    FilterDateOutdated: '' as FilterFunction,
    FilterDateToday: '' as FilterFunction,
    FilterDateYesterday: '' as FilterFunction,
    FilterDateWeek: '' as FilterFunction,
    FilterDateNextWeek: '' as FilterFunction,
    FilterDateMonth: '' as FilterFunction,
    FilterDateNextMonth: '' as FilterFunction,
    FilterDateNotSpecified: '' as FilterFunction,
    FilterDateCustom: '' as FilterFunction,
    ShowEmptyGroups: '' as ViewCategoryAction,
    HideArchived: '' as ViewOptionsAction,
    CanDeleteObject: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanEditSpace: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanArchiveSpace: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanDeleteSpace: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanJoinSpace: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanLeaveSpace: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    IsClipboardAvailable: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    BlobImageMetadata: '' as Resource<(file: FileOrBlob, blob: Ref<Blob>) => Promise<BlobMetadata | undefined>>,
    BlobVideoMetadata: '' as Resource<(file: FileOrBlob, blob: Ref<Blob>) => Promise<BlobMetadata | undefined>>
  },
  pipeline: {
    PresentationMiddleware: '' as Ref<PresentationMiddlewareFactory>,
    AnalyticsMiddleware: '' as Ref<PresentationMiddlewareFactory>
  },
  extension: {
    Audio: '' as Ref<FilePreviewExtension>,
    Image: '' as Ref<FilePreviewExtension>,
    Video: '' as Ref<FilePreviewExtension>,
    PDF: '' as Ref<FilePreviewExtension>,
    Text: '' as Ref<FilePreviewExtension>
  }
})
