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
  deleteMasterTag
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
import ViewsSection from './components/settings/ViewsSection.svelte'
import EditView from './components/settings/EditView.svelte'

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
    EditView
  },
  completion: {
    CardQuery: queryCard
  },
  resolver: {
    Location: resolveLocation,
    LocationData: resolveLocationData
  },
  actionImpl: {
    DeleteMasterTag: deleteMasterTag
  },
  function: {
    CardTitleProvider: getCardTitle,
    CardIdProvider: getCardId,
    GetCardLink: getCardLink
  }
})
