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
import type { SchemaTypeId } from '@hcengineering/schema'
import schema from '../plugin'
import type { SchemaMixin } from '../types'

export function getSchemaMixin (hierarchy: Hierarchy, schemaTypeId: SchemaTypeId): SchemaMixin {
  const schemaTypeClass = hierarchy.getClass(schemaTypeId)
  if (!hierarchy.hasMixin(schemaTypeClass, schema.mixin.SchemaMixin)) {
    throw new Error(`Mixin ${schema.mixin.SchemaMixin} not found for schema class ${schemaTypeId}`)
  }
  return hierarchy.as(schemaTypeClass, schema.mixin.SchemaMixin)
}
