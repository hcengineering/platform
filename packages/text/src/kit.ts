//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { AnyExtension, Extension } from '@tiptap/core'

export type ExtensionFactory = <T extends AnyExtension = AnyExtension>(
  extension: T,
  options?: Partial<T['options']> | boolean
) => ExtensionSpec<T>

export interface ExtensionSpec<T extends AnyExtension = AnyExtension> {
  extension: T
  options: Partial<T['options']> | boolean
}

export type ExtensionSpecOptions<T> = {
  [K in keyof T]: T[K] extends ExtensionSpec<infer E> ? Partial<E['options']> | boolean : never
}

export function extensionKit<O, K> (
  name: string,
  fn: (e: ExtensionFactory, o: O) => K
): Extension<O & ExtensionSpecOptions<K>> {
  return Extension.create({
    name,
    addExtensions () {
      const e: ExtensionFactory = (extension, options) => {
        // ExtensionFactory -> ExtensionSpec is mostly intented as a wrapper to provide a comfortable typing
        return { extension, options: options ?? true }
      }

      const extensions: AnyExtension[] = []
      const entries: object = fn(e, this.options) as any

      for (const [key, _data] of Object.entries(entries)) {
        const data = _data as ExtensionSpec<AnyExtension>
        if (data?.extension === undefined) continue

        let options = mergeKitOptions(data.options, (this.options as any)[key]) ?? false

        // "false" is indication that the extension should not be loaded at all
        if (options === false) continue

        // "true" is indication that the extension should be loaded with whatever options some parent loader provided
        if (options === true) {
          if (typeof data.options === 'object') {
            options = data.options
          } else {
            options = {}
          }
        }

        extensions.push(data.extension.configure(options))
      }

      return extensions
    }
  })
}

export function mergeKitOptions<T extends Record<string, any>> (target: T, source: T): T {
  if (typeof target === 'object' && typeof source === 'object') {
    const output = { ...target }
    Object.keys(source).forEach((key: keyof T) => {
      const a = target[key]
      const b = source[key]
      if (typeof a === 'object' && typeof b === 'object') {
        output[key] = mergeKitOptions(a, b)
      } else {
        output[key] = b ?? a
      }
    })
    return output
  }

  return source ?? target
}
