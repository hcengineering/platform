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
  import type { Doc, Ref } from '@anticrm/core'
  import core from '@anticrm/core'
  import { CircleButton, IconAdd, Label, showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import recruit from '../../plugin'
  import FileDuo from '../icons/FileDuo.svelte'
  import CreateOpinion from './CreateOpinion.svelte'

  export let objectId: Ref<Doc>

  export let opinions: number

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateOpinion, { review: objectId }, ev.target as HTMLElement)
  }
</script>

<div class="applications-container">
  <div class="flex-row-center">
    <div class="title"><Label label={recruit.string.Opinions} /></div>
    <CircleButton icon={IconAdd} size={'small'} selected on:click={createApp} />
  </div>
  {#if opinions > 0}
    <Table 
      _class={recruit.class.Opinion}
      config={['', 'value', 'description', '$lookup.modifiedBy']}
      options={{
        lookup: {
          modifiedBy: core.class.Account
        }
      }}
      query={ { attachedTo: objectId } }
      loadingProps={ { length: opinions } }
    />
  {:else}
    <div class="flex-col-center mt-5 createapp-container">
      <FileDuo size={'large'} />
      <div class="small-text content-dark-color mt-2">
        <Label label={recruit.string.NoReviewForCandidate} />
      </div>
      <div class="text-sm">
        <div class='over-underline' on:click={createApp}>
          <Label label={recruit.string.CreateAnReview} />
        </div>
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
