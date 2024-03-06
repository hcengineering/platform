//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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

import type { ComponentType, SvelteComponent } from 'svelte'

export type SvelteRendererComponent = typeof SvelteComponent | ComponentType

export interface SvelteRendererOptions {
  element: HTMLElement
  props?: Record<string, any>
  context?: any
}

export class SvelteRenderer {
  private readonly component: SvelteComponent
  element: HTMLElement
  props: Record<string, any>

  constructor (component: SvelteRendererComponent, { element, props, context }: SvelteRendererOptions) {
    this.element = element
    this.element.classList.add('svelte-renderer')
    this.props = props ?? {}

    const options = { target: element, props, context }
    const Component = component
    this.component = new Component(options)
  }

  updateProps (props: Record<string, any>): void {
    this.component.$set(props)
  }

  onKeyDown (props: Record<string, any>): boolean {
    if (this.component.onKeyDown !== undefined) {
      return this.component.onKeyDown(props.event)
    }
    return false
  }

  destroy (): void {
    if (this.component.done !== undefined) {
      this.component.done()
    }
    this.component.$destroy()
  }
}
