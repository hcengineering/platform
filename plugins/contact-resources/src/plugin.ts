//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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

import contact, { contactId } from '@hcengineering/contact'
import { type Client, type Doc } from '@hcengineering/core'
import { type IntlString, mergeIds, type Resource } from '@hcengineering/platform'
import { type LabelAndProps, type Location } from '@hcengineering/ui/src/types'
import {
  type CreateAggregationManagerFunc,
  type GrouppingManagerResource,
  type FilterFunction,
  type SortFunc,
  type ViewActionAvailabilityFunction
} from '@hcengineering/view'

export default mergeIds(contactId, contact, {
  string: {
    Apply: '' as IntlString,
    CreatePerson: '' as IntlString,
    OrganizationNamePlaceholder: '' as IntlString,
    OrganizationsNamePlaceholder: '' as IntlString,
    PersonLocationPlaceholder: '' as IntlString,
    PersonsNamePlaceholder: '' as IntlString,
    Organizations: '' as IntlString,
    Organization: '' as IntlString,
    SelectFolder: '' as IntlString,
    OrganizationsFolder: '' as IntlString,
    PersonsFolder: '' as IntlString,
    Name: '' as IntlString,
    ContactCreateLabel: '' as IntlString,
    SocialLinks: '' as IntlString,
    ViewActivity: '' as IntlString,
    Status: '' as IntlString,
    SetStatus: '' as IntlString,
    ClearStatus: '' as IntlString,
    SaveStatus: '' as IntlString,
    Location: '' as IntlString,
    Cancel: '' as IntlString,
    StatusDueDate: '' as IntlString,
    StatusName: '' as IntlString,
    NoExpire: '' as IntlString,
    StatusDueDateTooltip: '' as IntlString,
    CopyToClipboard: '' as IntlString,
    ViewFullProfile: '' as IntlString,
    Member: '' as IntlString,
    NoMembers: '' as IntlString,
    AddMember: '' as IntlString,
    KickEmployee: '' as IntlString,
    KickEmployeeDescr: '' as IntlString,
    ResendInvite: '' as IntlString,
    ResendInviteDescr: '' as IntlString,
    Email: '' as IntlString,
    CreateEmployee: '' as IntlString,
    Inactive: '' as IntlString,
    Active: '' as IntlString,
    Role: '' as IntlString,
    NotSpecified: '' as IntlString,
    MergePersons: '' as IntlString,
    MergePersonsFrom: '' as IntlString,
    MergePersonsTo: '' as IntlString,
    SelectAvatar: '' as IntlString,
    Avatar: '' as IntlString,
    GravatarsManaged: '' as IntlString,
    Through: '' as IntlString,
    AvatarProvider: '' as IntlString,

    AddMembersHeader: '' as IntlString,
    Assigned: '' as IntlString,
    Unassigned: '' as IntlString,
    CategoryCurrentUser: '' as IntlString,
    CategoryOther: '' as IntlString,
    DeleteEmployee: '' as IntlString,
    DeleteEmployeeDescr: '' as IntlString,
    HasMessagesIn: '' as IntlString,
    HasNewMessagesIn: '' as IntlString
  },
  function: {
    GetContactLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    EmployeeSort: '' as SortFunc,
    FilterChannelInResult: '' as FilterFunction,
    FilterChannelNinResult: '' as FilterFunction,
    FilterChannelHasMessagesResult: '' as FilterFunction,
    FilterChannelHasNewMessagesResult: '' as FilterFunction,
    PersonTooltipProvider: '' as Resource<(client: Client, doc?: Doc | null) => Promise<LabelAndProps | undefined>>,
    CanResendInvitation: '' as Resource<ViewActionAvailabilityFunction>
  },
  aggregation: {
    CreatePersonAggregationManager: '' as CreateAggregationManagerFunc,
    GrouppingPersonManager: '' as GrouppingManagerResource
  }
})
