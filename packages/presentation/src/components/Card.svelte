<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { IntlString } from '@anticrm/platform'

  import { createEventDispatcher } from 'svelte'
  import type { Ref, Class, Space } from '@anticrm/core'

  // import Close from './internal/icons/Close.svelte'
  // import ScrollBox from './ScrollBox.svelte'
  import Button from '@anticrm/ui/src/components/Button.svelte'
  import Label from '@anticrm/ui/src/components/Label.svelte'
  import SpaceSelect from './SpaceSelect.svelte'

  export let spaceClass: Ref<Class<Space>>
  export let label: IntlString
  export let okLabel: IntlString
  export let okAction: () => void
  export let canSave: boolean = false

  const dispatch = createEventDispatcher()
</script>

<form class="card-container">
  <div class="card-bg" />
  <div class="flex-between header">
    <div class="overflow-label label"><Label {label} /></div>
    <div class="tool"><Button disabled={!canSave} label={okLabel} size={'small'} transparent on:click={() => { okAction(); dispatch('close') }} /></div>
  </div>
  <div class="content"><slot /></div>
  <div class="flex-col pool">
    <div class="separator" />
    <SpaceSelect _class={spaceClass} label={'Title'} placeholder={'Select Project'} />
  </div>
</form>

<style lang="scss">
  .card-container {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 20rem;
    border-radius: 1.25rem;
    backdrop-filter: blur(30px);
    filter: drop-shadow(0 1.5rem 4rem rgba(0, 0, 0, .6));

    .header {
      flex-shrink: 0;
      padding: 1rem 1.25rem 1rem 1.75rem;
      .label {
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
      }
      .tool { margin-left: .75rem; }
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      margin: 0 1.75rem;
      height: fit-content;
    }

    .pool {
      margin: 0 1.75rem 1.5rem;
      color: var(--theme-caption-color);
      .separator {
        margin: 1rem 0;
        height: 1px;
        background-color: #fff;
        opacity: .1;
      }
    }

    .card-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: 1.25rem;
      opacity: .2;
      z-index: -1;
    }
  }
</style>