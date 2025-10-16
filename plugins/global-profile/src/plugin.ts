//
// Copyright © 2024 Huly Platform Contributors.
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

import { type Asset, type IntlString, plugin, type Plugin } from '@hcengineering/platform'

export const globalProfileId = 'global-profile' as Plugin
export const globalProfileRoute = 'user'

export default plugin(globalProfileId, {
  component: {
    GlobalProfileApp: '' as any
  },
  icon: {
    Globe: '' as Asset
  },
  image: {
    ProfileBackground: '' as Asset,
    ProfileBackgroundLight: '' as Asset
  },
  string: {
    GlobalProfile: '' as IntlString,
    EditProfile: '' as IntlString,
    GeneralInformation: '' as IntlString,
    FirstName: '' as IntlString,
    LastName: '' as IntlString,
    City: '' as IntlString,
    Country: '' as IntlString,
    Bio: '' as IntlString,
    FirstNamePlaceholder: '' as IntlString,
    LastNamePlaceholder: '' as IntlString,
    CityPlaceholder: '' as IntlString,
    CountryPlaceholder: '' as IntlString,
    BioPlaceholder: '' as IntlString,
    Save: '' as IntlString,
    Cancel: '' as IntlString,
    MaximumLength: '' as IntlString,
    Required: '' as IntlString,
    ProfileVisibility: '' as IntlString,
    PublicProfile: '' as IntlString,
    PrivateProfile: '' as IntlString,
    PublicProfileDescription: '' as IntlString,
    PrivateProfileDescription: '' as IntlString,
    AddBioPlaceholder: '' as IntlString,
    AddLocationPlaceholder: '' as IntlString,
    ProfileNotAvailable: '' as IntlString
  }
})
