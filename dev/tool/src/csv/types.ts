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
import { Class, Doc, Ref } from '@hcengineering/core'
import { Customer } from '@hcengineering/lead'
import { IntlString } from '@hcengineering/platform'

export interface CustomCustomer extends Customer {
  annualTurnover?: string
  currency?: string
  comment?: string
  source_ka?: string
  employees_count?: number
  activity_area?: string
  company_type?: string
  processing_status?: string
  responsible?: string

  dialog_area?: string
  sales_manager?: string
  bot_account?: string
  contacts?: string
  contact_person?: string
}

export interface FieldType {
  name: string
  type?: Ref<Class<Doc>>
  label?: IntlString
  sourceClass?: Ref<Class<Doc>>
  enumName?: string
  fName?: string
}
