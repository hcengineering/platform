//
// Copyright © 2026 TraceX SAS.
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

import type { CardSpace, MasterTag } from '@hcengineering/card'
import type { Class, Doc, Domain, Ref } from '@hcengineering/core'
import { plugin, type IntlString, type Plugin } from '@hcengineering/platform'

export const formsId = 'forms' as Plugin
export const DOMAIN_FORMS = 'forms' as Domain

export type FormMode = 'public' | 'private-fixed' | 'private-auto'

/** Workspace publication settings for a dynamically generated card form. */
export interface FormConfiguration extends Doc {
  masterTag: Ref<MasterTag>
  enabled: boolean
  mode?: FormMode
  targetSpace?: Ref<CardSpace>
}

export interface FormField {
  name: string
  label: IntlString
  kind: 'text' | 'number' | 'boolean' | 'date' | 'markup' | 'enum' | 'reference' | 'array' | 'json'
  required: boolean
  values?: string[]
  item?: FormField
  defaultValue?: unknown
}

/** Returns whether a field can be filled directly in a public form. */
export function isFormInputField (field: FormField): boolean {
  if (field.name === 'id' || field.name.startsWith('_') || field.kind === 'reference') return false
  return field.kind !== 'array' || (field.item !== undefined && isFormInputField(field.item))
}

/** Transient schema derived from the referenced MasterTag; never persisted. */
export interface FormSchema {
  id: string
  mode: FormMode
  label: IntlString
  description?: string
  fields: FormField[]
}

export interface FormSubmissionResult {
  id: string
  url: string
}

export default plugin(formsId, {
  class: {
    FormConfiguration: '' as Ref<Class<FormConfiguration>>
  },
  string: {
    Forms: '' as IntlString,
    Enabled: '' as IntlString,
    TargetSpace: '' as IntlString
  }
})
