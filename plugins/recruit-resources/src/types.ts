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

import type { Class, PropertyOfType, Type } from '@hcengineering/core'
import type { Resource } from '@hcengineering/platform'
import type { ScriptAttribute } from '@hcengineering/recruit'
import type { ComponentType, SvelteComponent } from 'svelte'

/** @public */
export interface ScriptTypedAttributeEditorComponentProps<T extends Type<any>> {
  object: ScriptAttribute<T extends Type<infer P> ? P : never>
  readonly: boolean
}

/** @public */
export type ScriptTypedAttributeEditorComponentType<T extends Type<any>> = ComponentType<
SvelteComponent<ScriptTypedAttributeEditorComponentProps<T>>
>

/** @public */
export interface ScriptTypedAttributeEditorMixin<T extends Type<any>> extends Class<T> {
  editor: Resource<ScriptTypedAttributeEditorComponentType<T>>
}

/** @public */
export type ScriptTypedAttributeFactoryFn<T extends Type<any>> = () => Promise<
Pick<ScriptAttribute<PropertyOfType<T>>, 'defaultValue'>
>

/** @public */
export interface ScriptTypedAttributeFactoryMixin<T extends Type<any>> extends Class<T> {
  factory: Resource<ScriptTypedAttributeFactoryFn<T>>
}

/** @public */
export type ScriptTypedPropertyEditorComponentChange<T extends Type<any>> =
  | ((value: PropertyOfType<T>) => Promise<boolean>)
  | null

/** @public */
export interface ScriptTypedPropertyEditorComponentProps<T extends Type<any>> {
  attribute: ScriptAttribute<T>
  value: PropertyOfType<T>
  change: ScriptTypedPropertyEditorComponentChange<T>
}

/** @public */
export type ScriptTypedPropertyEditorComponentType<T extends Type<any>> = ComponentType<
SvelteComponent<ScriptTypedPropertyEditorComponentProps<T>>
>

/** @public */
export interface ScriptTypedPropertyEditorMixin<T extends Type<any>> extends Class<T> {
  editor: Resource<ScriptTypedPropertyEditorComponentType<T>>
}
