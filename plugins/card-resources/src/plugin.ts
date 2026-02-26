//
// Copyright © 2025 Hardcore Engineering Inc.
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

import card, { cardId } from '@hcengineering/card'
import { type Permission, type Doc, type Ref } from '@hcengineering/core'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { type ObjectSearchCategory, type ObjectSearchFactory } from '@hcengineering/presentation'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import type { ViewletDescriptor, Viewlet } from '@hcengineering/view'
import type { ValueFormatter } from '@hcengineering/converter'

export default mergeIds(cardId, card, {
  component: {
    ManageMasterTags: '' as AnyComponent,
    ManageMasterTagsContent: '' as AnyComponent,
    ManageMasterTagsTools: '' as AnyComponent,
    MasterTags: '' as AnyComponent,
    CreateTag: '' as AnyComponent,
    CardPresenter: '' as AnyComponent,
    CardsPresenter: '' as AnyComponent,
    FavoriteCardPresenter: '' as AnyComponent,
    EditCard: '' as AnyComponent,
    Main: '' as AnyComponent,
    GeneralSection: '' as AnyComponent,
    ProperitiesSection: '' as AnyComponent,
    TagsSection: '' as AnyComponent,
    ChildsSection: '' as AnyComponent,
    RelationsSection: '' as AnyComponent,
    SetParentActionPopup: '' as AnyComponent,
    RelationSetting: '' as AnyComponent,
    ViewsSection: '' as AnyComponent,
    EditView: '' as AnyComponent,
    CardEditor: '' as AnyComponent,
    CardRefPresenter: '' as AnyComponent,
    ChangeType: '' as AnyComponent,
    CreateCardButton: '' as AnyComponent,
    CreateSpace: '' as AnyComponent,
    SpacePresenter: '' as AnyComponent,
    TypesNavigator: '' as AnyComponent,
    RolesSection: '' as AnyComponent,
    EditRole: '' as AnyComponent,
    CardWidget: '' as AnyComponent,
    CardWidgetTab: '' as AnyComponent,
    CreateCard: '' as AnyComponent,
    CardHeaderButton: '' as AnyComponent,
    CreateRolePopup: '' as AnyComponent
  },
  function: {
    CardFactory: '' as Resource<(props?: Record<string, any>) => Promise<Ref<Doc> | undefined>>,
    FormatCardMarkdownValue: '' as Resource<ValueFormatter>
  },
  permission: {
    CreateCard: '' as Ref<Permission>,
    RemoveCard: '' as Ref<Permission>,
    UpdateCard: '' as Ref<Permission>,
    AddTag: '' as Ref<Permission>,
    RemoveTag: '' as Ref<Permission>,
    ForbidCreateCard: '' as Ref<Permission>,
    ForbidRemoveCard: '' as Ref<Permission>,
    ForbidUpdateCard: '' as Ref<Permission>,
    ForbidAddTag: '' as Ref<Permission>,
    ForbidRemoveTag: '' as Ref<Permission>
  },
  sectionComponent: {
    AttachmentsSection: '' as AnyComponent,
    ChildrenSection: '' as AnyComponent,
    ContentSection: '' as AnyComponent,
    PropertiesSection: '' as AnyComponent,
    RelationsSection: '' as AnyComponent,
    CommunicationMessagesSection: '' as AnyComponent,
    OldMessagesSection: '' as AnyComponent
  },
  completion: {
    CardQuery: '' as Resource<ObjectSearchFactory>,
    CardCategory: '' as Ref<ObjectSearchCategory>
  },
  viewlet: {
    CardTable: '' as Ref<Viewlet>,
    CardList: '' as Ref<Viewlet>,
    CardChildList: '' as Ref<Viewlet>,
    CardFeedDescriptor: '' as Ref<ViewletDescriptor>,
    CardFeed: '' as Ref<Viewlet>,
    CardRelationshipTable: '' as Ref<Viewlet>
  },
  string: {
    CreateMasterTag: '' as IntlString,
    CreateTag: '' as IntlString,
    Content: '' as IntlString,
    Parent: '' as IntlString,
    CardLibrary: '' as IntlString,
    ConfigDescription: '' as IntlString,
    SearchCard: '' as IntlString,
    MinimizeAll: '' as IntlString,
    ExpandAll: '' as IntlString,
    DeleteTag: '' as IntlString,
    DeleteTagConfirm: '' as IntlString,
    DeleteMasterTag: '' as IntlString,
    DeleteMasterTagConfirm: '' as IntlString,
    TagRelations: '' as IntlString,
    UnsetParent: '' as IntlString,
    SetParent: '' as IntlString,
    CreateChild: '' as IntlString,
    Children: '' as IntlString,
    CreateView: '' as IntlString,
    EditView: '' as IntlString,
    SelectViewType: '' as IntlString,
    Document: '' as IntlString,
    Documents: '' as IntlString,
    ChangeType: '' as IntlString,
    ChangeTypeWarning: '' as IntlString,
    MasterDetailViews: '' as IntlString,
    SelectType: '' as IntlString,
    CreateSpace: '' as IntlString,
    NumberTypes: '' as IntlString,
    Properties: '' as IntlString,
    NoChildren: '' as IntlString,
    AddCollaborators: '' as IntlString,
    CardTitle: '' as IntlString,
    CardContent: '' as IntlString,
    Post: '' as IntlString,
    ShowLess: '' as IntlString,
    Duplicate: '' as IntlString,
    Export: '' as IntlString,
    Import: '' as IntlString,
    NewVersion: '' as IntlString,
    Versioning: '' as IntlString,
    EnableVersioning: '' as IntlString,
    EnableVersioningConfirm: '' as IntlString,
    NewVersionConfirmation: '' as IntlString,
    RelationCopyDescr: '' as IntlString,
    CreateCardPersmissionDescription: '' as IntlString,
    UpdateCardPersmissionDescription: '' as IntlString,
    RemoveCardPersmissionDescription: '' as IntlString,
    AddTagPersmissionDescription: '' as IntlString,
    RemoveTagPersmissionDescription: '' as IntlString,
    RemoveCard: '' as IntlString,
    UpdateCard: '' as IntlString,
    CreateCardPermission: '' as IntlString,
    AddTagPermission: '' as IntlString,
    RemoveTag: '' as IntlString,
    ForbidCreateCardPersmissionDescription: '' as IntlString,
    ForbidUpdateCardPersmissionDescription: '' as IntlString,
    ForbidRemoveCardPersmissionDescription: '' as IntlString,
    ForbidAddTagPersmissionDescription: '' as IntlString,
    ForbidRemoveTagPersmissionDescription: '' as IntlString,
    ForbidRemoveCard: '' as IntlString,
    ForbidUpdateCard: '' as IntlString,
    ForbidCreateCardPermission: '' as IntlString,
    ForbidAddTagPermission: '' as IntlString,
    ForbidRemoveTag: '' as IntlString,
    CardUpdated: '' as IntlString,
    CardCreated: '' as IntlString
  }
})
