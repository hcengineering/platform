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

import { type Resources } from '@hcengineering/platform'
import MasterTags from './components/MasterTags.svelte'
import CreateTag from './components/CreateTag.svelte'
import CardPresenter from './components/CardPresenter.svelte'
import EditCard from './components/EditCard.svelte'
import Main from './components/Main.svelte'
import {
  getCardId,
  getCardTitle,
  resolveLocation,
  resolveLocationData,
  getCardLink,
  queryCard,
  deleteMasterTag,
  editSpace,
  cardCustomLinkEncode,
  cardCustomLinkMatch,
  openCardInSidebar,
  checkRelationsSectionVisibility,
  getSpaceAccessPublicLink,
  canGetSpaceAccessPublicLink
} from './utils'
import ManageMasterTagsContent from './components/settings/ManageMasterTagsContent.svelte'
import ManageMasterTagsTools from './components/settings/ManageMasterTagsTools.svelte'
import ManageMasterTags from './components/settings/ManageMasterTags.svelte'
import GeneralSection from './components/settings/GeneralSection.svelte'
import ProperitiesSection from './components/settings/ProperitiesSection.svelte'
import TagsSection from './components/settings/TagsSection.svelte'
import RelationsSection from './components/settings/RelationsSection.svelte'
import ChildsSection from './components/settings/ChildsSection.svelte'
import SetParentActionPopup from './components/SetParentActionPopup.svelte'
import RelationSetting from './components/settings/RelationSetting.svelte'
import ViewsSection from './components/settings/view/ViewsSection.svelte'
import EditView from './components/settings/view/EditView.svelte'
import CardEditor from './components/CardEditor.svelte'
import CardRefPresenter from './components/CardRefPresenter.svelte'
import ChangeType from './components/ChangeType.svelte'
import CreateCardButton from './components/CreateCardButton.svelte'
import CardArrayEditor from './components/CardArrayEditor.svelte'
import NewCardHeader from './components/navigator/NewCardHeader.svelte'
import SpacePresenter from './components/navigator/SpacePresenter.svelte'
import LabelsPresenter from './components/LabelsPresenter.svelte'
import RolesSection from './components/settings/RolesSection.svelte'
import EditRole from './components/settings/EditRole.svelte'
import CardWidget from './components/CardWidget.svelte'

// Card Sections
import AttachmentsCardSection from './components/sections/AttachmentsSection.svelte'
import ChildrenCardSection from './components/sections/ChildrenSection.svelte'
import ContentCardSection from './components/sections/ContentSection.svelte'
import PropertiesCardSection from './components/sections/PropertiesSection.svelte'
import RelationsCardSection from './components/sections/RelationsSection.svelte'
import FavoriteCardPresenter from './components/FavoriteCardPresenter.svelte'
import CardTagsColored from './components/CardTagsColored.svelte'
import CardTagColored from './components/CardTagColored.svelte'
import CardWidgetTab from './components/CardWidgetTab.svelte'
import CardIcon from './components/CardIcon.svelte'
import CardFeedView from './components/CardFeedView.svelte'

export { default as CardSelector } from './components/CardSelector.svelte'
export { default as CardIcon } from './components/CardIcon.svelte'
export { default as Navigator } from './components/navigator-next/Navigator.svelte'
export { default as Favorites } from './components/Favorites.svelte'
export { default as CardPresenter } from './components/CardPresenter.svelte'
export { default as TypeSelector } from './components/TypeSelector.svelte'
export { default as AssociationsSelect } from './components/settings/view/AssociationsSelect.svelte'
export { default as CardTagsColored } from './components/CardTagsColored.svelte'
export { default as CardPathPresenter } from './components/CardPathPresenter.svelte'
export { default as CardTimestamp } from './components/CardTimestamp.svelte'

export * from './types'
export { getCardIconInfo, openCardInSidebar } from './utils'

export default async (): Promise<Resources> => ({
  component: {
    MasterTags,
    CreateTag,
    CardPresenter,
    EditCard,
    Main,
    ManageMasterTags,
    ManageMasterTagsContent,
    ManageMasterTagsTools,
    GeneralSection,
    ProperitiesSection,
    TagsSection,
    RelationsSection,
    ChildsSection,
    SetParentActionPopup,
    RelationSetting,
    ViewsSection,
    EditView,
    CardEditor,
    CardRefPresenter,
    ChangeType,
    CreateCardButton,
    CardArrayEditor,
    NewCardHeader,
    SpacePresenter,
    LabelsPresenter,
    RolesSection,
    EditRole,
    CardWidget,
    CardWidgetTab,
    FavoriteCardPresenter,
    CardTagColored,
    CardTagsColored,
    CardIcon,
    CardFeedView
  },
  sectionComponent: {
    AttachmentsSection: AttachmentsCardSection,
    ChildrenSection: ChildrenCardSection,
    ContentSection: ContentCardSection,
    PropertiesSection: PropertiesCardSection,
    RelationsSection: RelationsCardSection
  },
  completion: {
    CardQuery: queryCard
  },
  resolver: {
    Location: resolveLocation,
    LocationData: resolveLocationData
  },
  actionImpl: {
    DeleteMasterTag: deleteMasterTag,
    EditSpace: editSpace
  },
  function: {
    CardTitleProvider: getCardTitle,
    CardIdProvider: getCardId,
    GetCardLink: getCardLink,
    CardCustomLinkMatch: cardCustomLinkMatch,
    CardCustomLinkEncode: cardCustomLinkEncode,
    OpenCardInSidebar: openCardInSidebar,
    CheckRelationsSectionVisibility: checkRelationsSectionVisibility,
    GetSpaceAccessPublicLink: getSpaceAccessPublicLink,
    CanGetSpaceAccessPublicLink: canGetSpaceAccessPublicLink
  }
})
