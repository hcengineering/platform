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
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  getGravatarUrl,
  getName,
  type AvatarInfo,
  type Channel,
  type Contact,
  type Person
} from '@hcengineering/contact'
import {
  AccountRole,
  SocialIdType,
  type Class,
  type Client,
  type Data,
  type DocumentQuery,
  type Ref,
  type RelatedDocument,
  type WithLookup
} from '@hcengineering/core'
import login from '@hcengineering/login'
import { getResource, type IntlString, type Resources } from '@hcengineering/platform'
import { MessageBox, getBlobRef, getClient, type ObjectSearchResult } from '@hcengineering/presentation'
import {
  getPlatformAvatarColorByName,
  getPlatformAvatarColorForTextDef,
  getPlatformColorDef,
  hexColorToNumber,
  parseURL,
  showPopup,
  themeStore,
  type AnyComponent,
  type AnySvelteComponent,
  type ColorDefinition,
  type TooltipAlignment
} from '@hcengineering/ui'
import { AggregationManager } from '@hcengineering/view-resources'
import AccountArrayEditor from './components/AccountArrayEditor.svelte'
import AccountBox from './components/AccountBox.svelte'
import AssigneeBox from './components/AssigneeBox.svelte'
import AssigneePopup from './components/AssigneePopup.svelte'
import Avatar from './components/Avatar.svelte'
import AvatarRef from './components/AvatarRef.svelte'
import ChannelFilter from './components/ChannelFilter.svelte'
import ChannelIcon from './components/ChannelIcon.svelte'
import ChannelPanel from './components/ChannelPanel.svelte'
import ChannelPresenter from './components/ChannelPresenter.svelte'
import Channels from './components/Channels.svelte'
import ChannelsDropdown from './components/ChannelsDropdown.svelte'
import ChannelsEditor from './components/ChannelsEditor.svelte'
import ChannelsPresenter from './components/ChannelsPresenter.svelte'
import ChannelsView from './components/ChannelsView.svelte'
import CollaborationUserAvatar from './components/CollaborationUserAvatar.svelte'
import CombineAvatars from './components/CombineAvatars.svelte'
import ContactArrayEditor from './components/ContactArrayEditor.svelte'
import ContactPresenter from './components/ContactPresenter.svelte'
import ContactRefPresenter from './components/ContactRefPresenter.svelte'
import Contacts from './components/Contacts.svelte'
import ContactsTabs from './components/ContactsTabs.svelte'
import CreateEmployee from './components/CreateEmployee.svelte'
import CreateGuest from './components/CreateGuest.svelte'
import CreateOrganization from './components/CreateOrganization.svelte'
import CreatePerson from './components/CreatePerson.svelte'
import DeleteConfirmationPopup from './components/DeleteConfirmationPopup.svelte'
import EditMember from './components/EditMember.svelte'
import EditOrganization from './components/EditOrganization.svelte'
import EditOrganizationPanel from './components/EditOrganizationPanel.svelte'
import EditPerson from './components/EditPerson.svelte'
import EditableAvatar from './components/EditableAvatar.svelte'
import EmployeeArrayEditor from './components/EmployeeArrayEditor.svelte'
import EmployeeBox from './components/EmployeeBox.svelte'
import EmployeeBrowser from './components/EmployeeBrowser.svelte'
import EmployeeEditor from './components/EmployeeEditor.svelte'
import EmployeeFilter from './components/EmployeeFilter.svelte'
import EmployeeFilterValuePresenter from './components/EmployeeFilterValuePresenter.svelte'
import EmployeePresenter from './components/EmployeePresenter.svelte'
import EmployeeRefPresenter from './components/EmployeeRefPresenter.svelte'
import MemberPresenter from './components/MemberPresenter.svelte'
import Members from './components/Members.svelte'
import MembersBox from './components/MembersBox.svelte'
import MembersPresenter from './components/MembersPresenter.svelte'
import MergePersons from './components/MergePersons.svelte'
import OrganizationEditor from './components/OrganizationEditor.svelte'
import OrganizationPresenter from './components/OrganizationPresenter.svelte'
import PersonFilterValuePresenter from './components/PersonFilterValuePresenter.svelte'
import PersonEditor from './components/PersonEditor.svelte'
import PersonIcon from './components/PersonIcon.svelte'
import PersonPresenter from './components/PersonPresenter.svelte'
import PersonRefPresenter from './components/PersonRefPresenter.svelte'
import SelectAvatars from './components/SelectAvatars.svelte'
import SelectUsersPopup from './components/SelectUsersPopup.svelte'
import SocialEditor from './components/SocialEditor.svelte'
import SpaceMembers from './components/SpaceMembers.svelte'
import SpaceMembersEditor from './components/SpaceMembersEditor.svelte'
import SystemAvatar from './components/SystemAvatar.svelte'
import UserBox from './components/UserBox.svelte'
import UserBoxItems from './components/UserBoxItems.svelte'
import UserBoxList from './components/UserBoxList.svelte'
import UserDetails from './components/UserDetails.svelte'
import UserInfo from './components/UserInfo.svelte'
import UsersList from './components/UsersList.svelte'
import UsersPopup from './components/UsersPopup.svelte'
import ActivityChannelPresenter from './components/activity/ActivityChannelPresenter.svelte'
import NameChangedActivityMessage from './components/activity/NameChangedActivityMessage.svelte'
import IconAddMember from './components/icons/AddMember.svelte'
import ExpandRightDouble from './components/icons/ExpandRightDouble.svelte'
import IconMembers from './components/icons/Members.svelte'
import ContactNamePresenter from './components/ContactNamePresenter.svelte'

import { get } from 'svelte/store'
import { canResendInvitation } from './visibilityTester'
import contact from './plugin'
import {
  channelIdentifierProvider,
  channelTitleProvider,
  contactTitleProvider,
  employeeSort,
  filterChannelHasMessagesResult,
  filterChannelHasNewMessagesResult,
  filterChannelInResult,
  filterChannelNinResult,
  getContactFirstName,
  getContactLastName,
  getContactLink,
  getContactName,
  getCurrentEmployeeEmail,
  getCurrentEmployeeName,
  getCurrentEmployeePosition,
  getPersonTooltip,
  grouppingPersonManager,
  permissionsStore,
  resolveLocation,
  resolveLocationData
} from './utils'

export * from './utils'
export { employeeByIdStore } from './utils'
export * from './assignee'
export {
  AccountArrayEditor,
  AccountBox,
  AssigneeBox,
  AssigneePopup,
  Avatar,
  AvatarRef,
  Channels,
  ChannelsDropdown,
  ChannelsEditor,
  ChannelsView,
  CombineAvatars,
  ContactPresenter,
  ContactRefPresenter,
  CreateGuest,
  CreateOrganization,
  DeleteConfirmationPopup,
  EditPerson,
  EditableAvatar,
  EmployeeArrayEditor,
  EmployeeBox,
  EmployeeBrowser,
  EmployeeEditor,
  EmployeePresenter,
  EmployeeRefPresenter,
  ExpandRightDouble,
  IconAddMember,
  IconMembers,
  MemberPresenter,
  Members,
  MembersBox,
  MembersPresenter,
  OrganizationPresenter,
  PersonIcon,
  PersonPresenter,
  PersonRefPresenter,
  SelectAvatars,
  SelectUsersPopup,
  SpaceMembers,
  SystemAvatar,
  UserBox,
  UserBoxItems,
  UserBoxList,
  UserDetails,
  UserInfo,
  UsersList,
  UsersPopup
}

const toObjectSearchResult = (e: WithLookup<Contact>): ObjectSearchResult => ({
  doc: e,
  title: getName(getClient().getHierarchy(), e),
  icon: Avatar,
  iconProps: { size: 'x-small', avatar: e.avatar },
  component: UserInfo,
  componentProps: { size: 'smaller' }
})

async function queryContact (
  _class: Ref<Class<Contact>>,
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<Contact> = { name: { $like: `%${search}%` } }
  return await doContactQuery(_class, q, filter, client)
}

async function queryEmployee (
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q1 = await doContactQuery(
    contact.mixin.Employee,
    { name: { $like: `%${search}%` }, active: true },
    filter,
    client
  )
  const q2 = await doContactQuery(
    contact.mixin.Employee,
    { displayName: { $like: `%${search}%` }, active: true },
    {
      in: filter?.in,
      nin: [...(filter?.nin ?? []), ...Array.from(q1.map((it) => ({ _id: it.doc._id, _class: it.doc._class })))]
    },
    client
  )

  return q1.concat(q2)
}

async function doContactQuery<T extends Contact> (
  _class: Ref<Class<T>>,
  q: DocumentQuery<T>,
  filter: { in?: RelatedDocument[] | undefined, nin?: RelatedDocument[] | undefined } | undefined,
  client: Client
): Promise<ObjectSearchResult[]> {
  if (_class === contact.mixin.Employee) {
    q = { ...q, active: true }
  }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<T>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<T>)
    }
  }
  return (await client.findAll(_class, q, { limit: 200 })).map(toObjectSearchResult)
}

async function resendInvite (doc: Person): Promise<void> {
  const client = getClient()
  const emailSocialId = await client.findOne(contact.class.SocialIdentity, {
    attachedTo: doc._id,
    type: SocialIdType.EMAIL
  })
  if (emailSocialId == null) {
    console.error('Cannot find email social id for person', doc._id)
    return
  }

  showPopup(MessageBox, {
    label: contact.string.ResendInvite,
    message: contact.string.ResendInviteDescr,
    action: async () => {
      const _resendInvite = await getResource(login.function.ResendInvite)
      await _resendInvite(emailSocialId?.value, AccountRole.User)
    }
  })
}

async function kickEmployee (doc: Person): Promise<void> {
  showPopup(MessageBox, {
    label: contact.string.KickEmployee,
    message: contact.string.KickEmployeeDescr,
    action: async () => {
      const client = getClient()

      const employee = client.getHierarchy().as(doc, contact.mixin.Employee)
      await client.update(employee, { active: false })

      if (doc.personUuid != null) {
        const leaveWorkspace = await getResource(login.function.LeaveWorkspace)
        await leaveWorkspace(doc.personUuid)
      }
    }
  })
}

async function openChannelURL (doc: Channel): Promise<void> {
  const url = parseURL(doc.value)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    window.open(url)
  }
}

export interface PersonLabelTooltip {
  personLabel?: IntlString
  placeholderLabel?: IntlString
  direction?: TooltipAlignment
  component?: AnySvelteComponent | AnyComponent
  props?: any
}

function getPersonColor (person: Data<WithLookup<AvatarInfo>>, name: string): ColorDefinition {
  const dark = get(themeStore).dark

  if (person.avatarProps?.color !== undefined) {
    if (person.avatarProps?.color?.startsWith('#')) {
      return getPlatformColorDef(hexColorToNumber(person.avatarProps?.color), dark)
    }
    return getPlatformAvatarColorByName(person.avatarProps?.color, dark)
  }
  return getPlatformAvatarColorForTextDef(name, dark)
}

export default async (): Promise<Resources> => ({
  actionImpl: {
    KickEmployee: kickEmployee,
    OpenChannel: openChannelURL,
    ResendInvite: resendInvite
  },
  activity: {
    NameChangedActivityMessage
  },
  component: {
    CreateGuest,
    ContactArrayEditor,
    PersonEditor,
    OrganizationEditor,
    ContactPresenter,
    ContactRefPresenter,
    PersonRefPresenter,
    PersonPresenter,
    OrganizationPresenter,
    ChannelsPresenter,
    CreatePerson,
    CollaborationUserAvatar,
    CreateOrganization,
    EditPerson,
    EditOrganization,
    SocialEditor,
    Contacts,
    ContactsTabs,
    EmployeePresenter,
    EmployeeRefPresenter,
    Members,
    MemberPresenter,
    MembersPresenter,
    EditMember,
    EmployeeArrayEditor,
    EmployeeEditor,
    CreateEmployee,
    AccountArrayEditor,
    ChannelFilter,
    MergePersons,
    Avatar,
    AvatarRef,
    UserBoxList,
    ChannelPresenter,
    ChannelPanel,
    ActivityChannelPresenter,
    SpaceMembers,
    SelectAvatars,
    UserBoxItems,
    EmployeeFilter,
    EmployeeFilterValuePresenter,
    PersonFilterValuePresenter,
    DeleteConfirmationPopup,
    PersonIcon,
    EditOrganizationPanel,
    ChannelIcon,
    SpaceMembersEditor,
    ContactNamePresenter
  },
  completion: {
    EmployeeQuery: async (
      client: Client,
      query: string,
      filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
    ) => await queryEmployee(client, query, filter),
    PersonQuery: async (client: Client, query: string, filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }) =>
      await queryContact(contact.class.Person, client, query, filter),
    OrganizationQuery: async (
      client: Client,
      query: string,
      filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
    ) => await queryContact(contact.class.Organization, client, query, filter)
  },
  function: {
    GetFileUrl: async (person: Data<WithLookup<AvatarInfo>>, name: string, width: number) => {
      if (person.avatar == null) {
        return {
          color: getPersonColor(person, name)
        }
      }
      const blobRef = await getBlobRef(person.avatar, undefined, width)
      return {
        url: blobRef.src,
        srcSet: blobRef.srcset,
        color: getPersonColor(person, name)
      }
    },
    GetGravatarUrl: async (person: Data<WithLookup<AvatarInfo>>, name: string, width: number = 64) => ({
      url: person.avatarProps?.url !== undefined ? getGravatarUrl(person.avatarProps?.url, width) : undefined,
      srcSet:
        person.avatarProps?.url !== undefined
          ? `${getGravatarUrl(person.avatarProps?.url, width)} 1x, ${getGravatarUrl(person.avatarProps?.url, width * 2)} 2x`
          : undefined,
      color: getPersonColor(person, name)
    }),
    GetColorUrl: async (person: Data<WithLookup<AvatarInfo>>, name: string) => ({
      color: getPersonColor(person, name)
    }),
    GetExternalUrl: async (person: Data<WithLookup<AvatarInfo>>, name: string) => ({
      color: getPersonColor(person, name),
      url: person.avatarProps?.url
    }),
    EmployeeSort: employeeSort,
    FilterChannelInResult: filterChannelInResult,
    FilterChannelNinResult: filterChannelNinResult,
    FilterChannelHasMessagesResult: filterChannelHasMessagesResult,
    FilterChannelHasNewMessagesResult: filterChannelHasNewMessagesResult,
    GetCurrentEmployeeName: getCurrentEmployeeName,
    GetCurrentEmployeeEmail: getCurrentEmployeeEmail,
    GetCurrentEmployeePosition: getCurrentEmployeePosition,
    GetContactName: getContactName,
    GetContactFirstName: getContactFirstName,
    GetContactLastName: getContactLastName,
    GetContactLink: getContactLink,
    ContactTitleProvider: contactTitleProvider,
    PersonTooltipProvider: getPersonTooltip,
    ChannelTitleProvider: channelTitleProvider,
    ChannelIdentifierProvider: channelIdentifierProvider,
    CanResendInvitation: canResendInvitation
  },
  resolver: {
    Location: resolveLocation,
    LocationData: resolveLocationData
  },
  aggregation: {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    CreatePersonAggregationManager: AggregationManager.create,
    GrouppingPersonManager: grouppingPersonManager
  },
  store: {
    Permissions: permissionsStore
  }
})
