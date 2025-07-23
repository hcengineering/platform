//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023, 2024 Hardcore Engineering Inc.
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

import { getResource } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui'
import type { ComponentType, SvelteComponent } from 'svelte'

export type SvelteRendererComponent = typeof SvelteComponent | ComponentType | AnyComponent

export interface SvelteRendererOptions {
  element: HTMLElement
  props?: Record<string, any>
  context?: any
}

export class SvelteRenderer {
  private component: SvelteComponent | null
  element: HTMLElement
  props: Record<string, any>
  destroyed = false

  constructor (component: SvelteRendererComponent, { element, props, context }: SvelteRendererOptions) {
    this.element = element
    this.element.classList.add('svelte-renderer')
    this.props = props ?? {}

    const options = { target: element, props, context }
    this.component = null
    if (typeof component !== 'string') {
      const Component = component
      this.component = new Component(options)
    } else {
      void getResource(component)
        .then((resource) => {
          if (resource == null || this.destroyed) return
          const Component = resource
          this.component = new Component({ ...options, props: this.props })
        })
        .catch((error) => {
          console.error(`Failed to load Svelte component ${component}`, error)
        })
    }
  }

  updateProps (props: Record<string, any>): void {
    this.component?.$set(props)
  }

  onKeyDown (props: Record<string, any>): boolean {
    if (this.component?.onKeyDown !== undefined) {
      return this.component?.onKeyDown(props.event)
    }
    return false
  }

  destroy (): void {
    this.destroyed = true
    if (this.component?.done !== undefined) {
      this.component?.done()
    }
    this.component?.$destroy()
  }
}
