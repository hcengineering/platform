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

import { Contact, formatName } from '@anticrm/contact'
import { Class, Client, Ref } from '@anticrm/core'
import { Resources } from '@anticrm/platform'
import { Avatar, ObjectSearchResult, UserInfo } from '@anticrm/presentation'
import Channels from './components/Channels.svelte'
import ChannelsEditor from './components/ChannelsEditor.svelte'
import ChannelsPresenter from './components/ChannelsPresenter.svelte'
import ChannelsView from './components/ChannelsView.svelte'
import ChannelsDropdown from './components/ChannelsDropdown.svelte'
import ContactPresenter from './components/ContactPresenter.svelte'
import Contacts from './components/Contacts.svelte'
import CreateOrganization from './components/CreateOrganization.svelte'
import CreateOrganizations from './components/CreateOrganizations.svelte'
import CreatePerson from './components/CreatePerson.svelte'
import CreatePersons from './components/CreatePersons.svelte'
import EditOrganization from './components/EditOrganization.svelte'
import EditPerson from './components/EditPerson.svelte'
import OrganizationPresenter from './components/OrganizationPresenter.svelte'
import PersonPresenter from './components/PersonPresenter.svelte'
import SocialEditor from './components/SocialEditor.svelte'
import contact from './plugin'
import EmployeeAccountPresenter from './components/EmployeeAccountPresenter.svelte'
import OrganizationEditor from './components/OrganizationEditor.svelte'
import OrganizationSelector from './components/OrganizationSelector.svelte'

export { Channels, ChannelsEditor, ContactPresenter, ChannelsView, OrganizationSelector, ChannelsDropdown }

async function queryContact (
  _class: Ref<Class<Contact>>,
  client: Client,
  search: string
): Promise<ObjectSearchResult[]> {
  return (await client.findAll(_class, { name: { $like: `%${search}%` } }, { limit: 200 })).map((e) => ({
    doc: e,
    title: formatName(e.name),
    icon: Avatar,
    iconProps: { size: 'x-small', avatar: e.avatar },
    component: UserInfo,
    componentProps: { size: 'x-small' }
  }))
}

export default async (): Promise<Resources> => ({
  component: {
    OrganizationEditor,
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
    EmployeeAccountPresenter
  },
  completion: {
    EmployeeQuery: async (client: Client, query: string) => await queryContact(contact.class.Employee, client, query),
    PersonQuery: async (client: Client, query: string) => await queryContact(contact.class.Person, client, query),
    OrganizationQuery: async (client: Client, query: string) =>
      await queryContact(contact.class.Organization, client, query)
  }
})
