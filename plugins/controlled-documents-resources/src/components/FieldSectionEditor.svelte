<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { IntlString } from '@hcengineering/platform'
  import { Icon, Label } from '@hcengineering/ui'
  import Chevron from './icons/Chevron.svelte'

  export let sectionType: IntlString | undefined = undefined
  export let expanded = false
  export let editable = false

  const dispatch = createEventDispatcher()

  function handleSectionToggled (): void {
    dispatch('toggle')
  }
</script>

<div class:pb-1={!expanded}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="section flex flex-grow" class:mb-0={!expanded}>
    <div draggable={true} class:before-header={!editable} class:tools={editable}>
      <slot name="before-header" />
    </div>
    <div class="flex-row-center">
      <div class="flex-row-center flex-grow fs-title text-xl dark-color">
        <div class="chevron hdr-alignment" class:expanded on:click|stopPropagation={handleSectionToggled}>
          <Icon icon={Chevron} size="large" />
        </div>
        <span class="hdr-alignment" on:click|stopPropagation={handleSectionToggled}><slot name="index" /></span>
        <span>.&nbsp;</span>
        <span class="label nowrap inline-flex flex-gap-1 flex-grow hdr-title hdr-alignment">
          {#if sectionType}
            <Label label={sectionType} />
          {/if}
          <slot name="header" />
        </span>
        <div class="tools hdr-alignment">
          <slot name="header-extra" />
        </div>
        <div class="buttons-group small-gap hdr-alignment">
          <slot name="tools" />
        </div>
      </div>
    </div>
  </div>

  <div class="content-container flex-col" class:expanded>
    <div class="before-content">
      <slot name="before-content" />
    </div>

    <div class="content flex-grow">
      <slot name="content" {editable} />
    </div>
  </div>
</div>

<style lang="scss">
  .section {
    padding: 1rem 0 0 1rem;

    &:hover {
      .chevron {
        visibility: visible;
      }
      .tools {
        visibility: visible;
      }
    }
  }
  .before-header {
    visibility: hidden;
  }
  .tools {
    visibility: hidden;
  }
  .chevron {
    visibility: visible;
    font-size: 0.675rem;
    color: var(--theme-caption-color);
    &.expanded {
      transform: rotateZ(90deg);
      visibility: hidden;
    }
  }
  .content-container {
    &:not(.expanded) {
      display: none;
    }
  }
  .content {
    margin: 0.25rem 1rem 1rem 3.25rem;
    max-width: 100%;
  }
  .before-content {
    padding: 0 3rem;
  }
  .hdr-title {
    overflow-x: hidden;
  }
  .hdr-alignment {
    position: relative;
    align-self: baseline;
  }
</style>
