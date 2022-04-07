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
  import type { FindOptions, Ref } from '@anticrm/core'
  import type { Customer, Lead } from '@anticrm/lead'
  import task from '@anticrm/task'
  import { CircleButton, IconAdd, Label, showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import lead from '../plugin'
  import CreateLead from './CreateLead.svelte'

  export let objectId: Ref<Customer>
  export let leads: number | undefined = undefined
  $: loadingProps = leads !== undefined ? { length: leads } : undefined

  const createLead = (ev: MouseEvent): void => {
    showPopup(CreateLead, { candidate: objectId, preserveCandidate: true }, ev.target as HTMLElement)
  }

  const options: FindOptions<Lead> = {
    lookup: {
      state: task.class.State
    }
  }
</script>

<div class="applications-container">
  <div class="flex-row-center">
    <div class="title">Leads</div>
    <CircleButton icon={IconAdd} size={'small'} selected on:click={createLead} />
  </div>
  {#if leads !== undefined && leads > 0}
    <Table 
      _class={lead.class.Lead}
      config={['', '$lookup.state']}
      options={options}
      query={ { attachedTo: objectId } }
      {loadingProps}
    />
  {:else}
    <div class="flex-col-center mt-5 createapp-container">
      <div class="text-sm content-dark-color mt-2">
        <Label label={lead.string.NoLeadsForDocument} />
      </div>
      <div class="text-sm">
        <div class='over-underline' on:click={createLead}><Label label={lead.string.CreateLead} /></div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .applications-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: .75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .createapp-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
  }
</style>
