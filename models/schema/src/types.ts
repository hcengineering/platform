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

import { Mixin } from '@hcengineering/model'
import core, { TClass } from '@hcengineering/model-core'
import type { Schema } from '@hcengineering/schema'
import type {
  SchemaEditorType,
  SchemaInitializer,
  SchemaMixin,
  SchemaValueEditorType,
  SchemaValueInitializer
} from '@hcengineering/schema-resources'
import type { Resource } from '@hcengineering/platform'
import schema from './plugin'

@Mixin(schema.mixin.SchemaMixin, core.class.Class)
export class TSchemaMixin<S extends Schema, V = any> extends TClass implements SchemaMixin<S> {
  editor!: Resource<SchemaEditorType<S>>
  initializer!: Resource<SchemaInitializer<S>>
  valueEditor!: Resource<SchemaValueEditorType<S, V>>
  valueInitializer!: Resource<SchemaValueInitializer<S, V>>
}
