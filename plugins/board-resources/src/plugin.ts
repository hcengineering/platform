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

import board, { boardId } from '@hcengineering/board'
import { type Ref, type StatusCategory } from '@hcengineering/core'
import { type IntlString, mergeIds } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui/src/types'

export default mergeIds(boardId, board, {
  string: {
    Completed: '' as IntlString,
    Name: '' as IntlString,
    BoardName: '' as IntlString,
    CreateBoard: '' as IntlString,
    OpenCard: '' as IntlString,
    CardName: '' as IntlString,
    More: '' as IntlString,
    SelectBoard: '' as IntlString,
    CreateCard: '' as IntlString,
    CardCreateLabel: '' as IntlString,
    Customer: '' as IntlString,
    Cards: '' as IntlString,
    NoCardsForDocument: '' as IntlString,
    CardPlaceholder: '' as IntlString,
    Board: '' as IntlString,
    Boards: '' as IntlString,
    MyBoards: '' as IntlString,
    BoardApplication: '' as IntlString,
    Card: '' as IntlString,
    Title: '' as IntlString,
    Assignee: '' as IntlString,
    ManageBoardStatuses: '' as IntlString,
    Description: '' as IntlString,
    DescriptionPlaceholder: '' as IntlString,
    Location: '' as IntlString,
    Members: '' as IntlString,
    IsArchived: '' as IntlString,
    BoardCreateLabel: '' as IntlString,
    Settings: '' as IntlString,
    Suggested: '' as IntlString,
    Labels: '' as IntlString,
    CreateLabel: '' as IntlString,
    SearchLabels: '' as IntlString,
    SelectColor: '' as IntlString,
    NoColor: '' as IntlString,
    NoColorInfo: '' as IntlString,
    Dates: '' as IntlString,
    Attachments: '' as IntlString,
    AddAttachment: '' as IntlString,
    DropFileToUpload: '' as IntlString,
    AttachFrom: '' as IntlString,
    AttachmentTip: '' as IntlString,
    Computer: '' as IntlString,
    CustomFields: '' as IntlString,
    AddButton: '' as IntlString,
    Actions: '' as IntlString,
    Cover: '' as IntlString,
    Join: '' as IntlString,
    Move: '' as IntlString,
    Copy: '' as IntlString,
    MakeTemplate: '' as IntlString,
    Archive: '' as IntlString,
    SendToBoard: '' as IntlString,
    Delete: '' as IntlString,
    HideDetails: '' as IntlString,
    ShowDetails: '' as IntlString,
    NewList: '' as IntlString,
    AddList: '' as IntlString,
    NewListPlaceholder: '' as IntlString,
    AddACard: '' as IntlString,
    AddCard: '' as IntlString,
    CardTitlePlaceholder: '' as IntlString,
    Create: '' as IntlString,
    CreateDescription: '' as IntlString,
    CreateSingle: '' as IntlString,
    CreateMultiple: '' as IntlString,
    MoveCard: '' as IntlString,
    Cancel: '' as IntlString,
    SelectDestination: '' as IntlString,
    List: '' as IntlString,
    Position: '' as IntlString,
    Current: '' as IntlString,
    Save: '' as IntlString,
    Remove: '' as IntlString,
    NullDate: '' as IntlString,
    ViewProfile: '' as IntlString,
    RemoveFromCard: '' as IntlString,
    LinkName: '' as IntlString,
    Edit: '' as IntlString,
    Update: '' as IntlString,
    DeleteAttachment: '' as IntlString,
    SearchMembers: '' as IntlString,
    DeleteCard: '' as IntlString,
    Menu: '' as IntlString,
    ShowMenu: '' as IntlString,
    ToArchive: '' as IntlString,
    CopyCard: '' as IntlString,
    AlsoCopy: '' as IntlString,
    CopyTo: '' as IntlString,
    NoResults: '' as IntlString,
    SwitchToLists: '' as IntlString,
    SwitchToCards: '' as IntlString,
    SearchArchive: '' as IntlString,
    Size: '' as IntlString,
    RemoveCover: '' as IntlString
  },
  statusCategory: {
    Completed: '' as Ref<StatusCategory>
  },
  component: {
    EditCard: '' as AnyComponent,
    Members: '' as AnyComponent,
    Settings: '' as AnyComponent,
    BoardHeader: '' as AnyComponent,
    BoardMenu: '' as AnyComponent,
    Archive: '' as AnyComponent,
    MenuMainPage: '' as AnyComponent,
    UserBoxList: '' as AnyComponent
  }
})
