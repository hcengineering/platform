//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type { Hierarchy } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import type { Schema, SchemaTypeId } from '@hcengineering/schema'
import type { ThemeOptions } from '@hcengineering/theme'
import { getSchemaMixin } from './getSchemaMixin'

export async function initializeSchema<S extends Schema> (
  hierarchy: Hierarchy,
  language: ThemeOptions['language'],
  schemaType: SchemaTypeId
): Promise<S> {
  const mixin = getSchemaMixin(hierarchy, schemaType)
  const initializer = await getResource(mixin.initializer)
  return await initializer(hierarchy, language)
}
