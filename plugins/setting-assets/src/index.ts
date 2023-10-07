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

import { loadMetadata } from '@hcengineering/platform'
import setting from '@hcengineering/setting'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(setting.icon, {
  EditProfile: `${icons}#edit`,
  Password: `${icons}#password`,
  Setting: `${icons}#settings`,
  Integrations: `${icons}#integration`,
  Support: `${icons}#support`,
  Privacy: `${icons}#privacy`,
  Terms: `${icons}#terms`,
  Signout: `${icons}#signout`,
  SelectWorkspace: `${icons}#selectWorkspace`,
  Clazz: `${icons}#clazz`,
  Enums: `${icons}#enums`
})
