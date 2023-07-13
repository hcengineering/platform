<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Ref } from '@hcengineering/core'
  import type { Customer } from '@hcengineering/lead'
  import { Button, IconAdd, Label, showPopup, resizeObserver, Scroller } from '@hcengineering/ui'
  import { Table } from '@hcengineering/view-resources'
  import lead from '../plugin'
  import CreateLead from './CreateLead.svelte'

  export let objectId: Ref<Customer>
  export let leads: number | undefined = undefined
  $: loadingProps = leads !== undefined ? { length: leads } : undefined

  const createLead = (ev: MouseEvent): void => {
    showPopup(CreateLead, { candidate: objectId, preserveCandidate: true }, ev.target as HTMLElement)
  }
  let wSection: number
</script>

<div class="antiSection" use:resizeObserver={(element) => (wSection = element.clientWidth)}>
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={lead.string.Leads} />
    </span>
    <Button icon={IconAdd} kind={'ghost'} on:click={createLead} />
  </div>
  {#if leads !== undefined && leads > 0}
    {#if wSection < 640}
      <Scroller horizontal>
        <Table
          _class={lead.class.Lead}
          config={['', 'status', 'doneState']}
          query={{ attachedTo: objectId }}
          {loadingProps}
        />
      </Scroller>
    {:else}
      <Table
        _class={lead.class.Lead}
        config={['', 'status', 'doneState']}
        query={{ attachedTo: objectId }}
        {loadingProps}
      />
    {/if}
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <span class="text-sm content-dark-color">
        <Label label={lead.string.NoLeadsForDocument} />
      </span>
      <span class="text-sm content-color over-underline" on:click={createLead}>
        <Label label={lead.string.CreateLead} />
      </span>
    </div>
  {/if}
</div>
