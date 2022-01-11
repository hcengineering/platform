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

import PersonPresenter from './components/PersonPresenter.svelte'
import ContactPresenter from './components/ContactPresenter.svelte'
import OrganizationPresenter from './components/OrganizationPresenter.svelte'
import ChannelsPresenter from './components/ChannelsPresenter.svelte'
import CreatePerson from './components/CreatePerson.svelte'
import CreateOrganization from './components/CreateOrganization.svelte'
import EditContact from './components/EditContact.svelte'
import EditPerson from './components/EditPerson.svelte'
import EditOrganization from './components/EditOrganization.svelte'
import CreatePersons from './components/CreatePersons.svelte'
import CreateOrganizations from './components/CreateOrganizations.svelte'
import SocialEditor from './components/SocialEditor.svelte'
import Contacts from './components/Contacts.svelte'
import { Resources } from '@anticrm/platform'
import RolePresenter from './components/RolePresenter.svelte'

export { ContactPresenter, EditContact }

export default async (): Promise<Resources> => ({
  component: {
    ContactPresenter,
    PersonPresenter,
    OrganizationPresenter,
    ChannelsPresenter,
    CreatePerson,
    CreateOrganization,
    EditPerson,
    EditOrganization,
    CreatePersons,
    CreateOrganizations,
    SocialEditor,
    Contacts,
    RolePresenter
  }
})
