<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import type { IntlString } from '@hcengineering/platform'
  import type { AnyComponent } from '..'
  import { Label, Component } from '..'

  export let label: IntlString
  export let categoryName: string
  export let tools: AnyComponent | undefined = undefined
  export let isOpen: boolean = true
  export let selected: boolean = false
  export let second: boolean = false

  $: id = `navGroup-${categoryName}`
</script>

<div class="hulyAccordionItem-container" class:second>
  <button class="hulyAccordionItem-header nav small" class:isOpen class:selected on:click={() => (isOpen = !isOpen)}>
    <div class="hulyAccordionItem-header__label-wrapper font-medium-12">
      <span class="hulyAccordionItem-header__label">
        <Label {label} />
      </span>
    </div>
    {#if tools}
      <div class="hulyAccordionItem-header__tools">
        <Component
          is={tools}
          props={{
            kind: 'tools',
            categoryName
          }}
        />
      </div>
    {/if}
  </button>
  <div {id} class="hulyAccordionItem-content">
    <slot />
  </div>
</div>
