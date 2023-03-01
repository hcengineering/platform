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

import { IntlString, mergeIds } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import templates, { templatesId } from '@hcengineering/templates'

export default mergeIds(templatesId, templates, {
  string: {
    Cancel: '' as IntlString,
    Templates: '' as IntlString,
    TemplatesHeader: '' as IntlString,
    CreateTemplate: '' as IntlString,
    ViewTemplate: '' as IntlString,
    EditTemplate: '' as IntlString,
    SaveTemplate: '' as IntlString,
    Suggested: '' as IntlString,
    SearchTemplate: '' as IntlString,
    TemplatePlaceholder: '' as IntlString,
    Field: '' as IntlString,
    TemplateCategory: '' as IntlString,
    CreateTemplateCategory: '' as IntlString,
    Copy: '' as IntlString
  },
  component: {
    Templates: '' as AnyComponent,
    CreateTemplateCategory: '' as AnyComponent
  }
})
