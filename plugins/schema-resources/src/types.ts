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

import type { Class, Hierarchy, Type } from '@hcengineering/core'
import type { Schema, SchemaTypeId } from '@hcengineering/schema'
import type { Resource } from '@hcengineering/platform'
import type { ThemeOptions } from '@hcengineering/theme'
import type { ComponentType, SvelteComponent } from 'svelte'

/** @public */
export type SchemaEditorSubmit<S extends Schema> = ((schema: S) => Promise<void>) | null

/** @public */
export interface SchemaEditorProps<S extends Schema> {
  schema: S
  submit: SchemaEditorSubmit<S>
  schemaTypes: SchemaTypeId[]
}

/** @public */
export type SchemaEditor<S extends Schema> = SvelteComponent<SchemaEditorProps<S>>

/** @public */
export type SchemaEditorType<S extends Schema> = ComponentType<SchemaEditor<S>>

/** @public */
export type SchemaInitializer<S extends Schema> = (
  hierarchy: Hierarchy,
  language: ThemeOptions['language']
) => Promise<S>

/** @public */
export type SchemaValueEditorSubmit<V> = ((value: V) => Promise<void>) | null

/** @public */
export interface SchemaValueEditorProps<S extends Schema, V> {
  schema: S
  value: V
  submit: SchemaValueEditorSubmit<V>
}

/** @public */
export type SchemaValueEditor<S extends Schema, V> = SvelteComponent<SchemaValueEditorProps<S, V>>

/** @public */
export type SchemaValueEditorType<S extends Schema, V> = ComponentType<SchemaValueEditor<S, V>>

/** @public */
export type SchemaValueInitializer<S extends Schema, V> = (hierarchy: Hierarchy, schema: S) => Promise<V>

/** @public */
export interface SchemaMixin<S extends Schema = any, V = any> extends Class<Type<Schema>> {
  editor: Resource<SchemaEditorType<S>>
  initializer: Resource<SchemaInitializer<S>>
  valueEditor: Resource<SchemaValueEditorType<S, V>>
  valueInitializer: Resource<SchemaValueInitializer<S, V>>
}
