//
// Copyright © 2022 Hardcore Engineering Inc.
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

import {
  getMetadata
} from '@hcengineering/platform'

import login from './plugin'
import type { Field } from './types'

/**
 * Generates password validation rules based on metadata.
 *
 * @returns {Field['rules']} An array of password validation rules.
 */
export function getPasswordValidationRules (): Field['rules'] {
  const passwordValidations = getMetadata(login.metadata.PasswordValidations)

  const passwordValidationRules: Field['rules'] = [
    {
      rule: (value: string) => value.length >= (passwordValidations?.MinLength ?? 0),
      notMatch: false,
      ruleDescr: login.string.PasswordMinLength,
      ruleDescrParams: { count: passwordValidations?.MinLength }
    },
    {
      rule: (value: string) => (value.match(/[^a-zA-Z0-9]/g)?.length ?? 0) >= (passwordValidations?.MinSpecialChars ?? 0),
      notMatch: false,
      ruleDescr: login.string.PasswordMinSpecialChars,
      ruleDescrParams: { count: passwordValidations?.MinSpecialChars }
    },
    {
      rule: (value: string) => (value.match(/[0-9]/g)?.length ?? 0) >= (passwordValidations?.MinDigits ?? 0),
      notMatch: false,
      ruleDescr: login.string.PasswordMinDigits,
      ruleDescrParams: { count: passwordValidations?.MinDigits }
    },
    {
      rule: (value: string) => (value.match(/[A-Z]/g)?.length ?? 0) >= (passwordValidations?.MinUpperChars ?? 0),
      notMatch: false,
      ruleDescr: login.string.PasswordMinUpperChars,
      ruleDescrParams: { count: passwordValidations?.MinUpperChars }
    },
    {
      rule: (value: string) => (value.match(/[a-z]/g)?.length ?? 0) >= (passwordValidations?.MinLowerChars ?? 0),
      notMatch: false,
      ruleDescr: login.string.PasswordMinLowerChars,
      ruleDescrParams: { count: passwordValidations?.MinLowerChars }
    }
  ]

  return passwordValidationRules
}
