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
  import type { Doc, Ref } from '@hcengineering/core'
  import { Button, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { Table } from '@hcengineering/view-resources'
  import recruit from '../../plugin'
  import FileDuo from '../icons/FileDuo.svelte'
  import CreateOpinion from './CreateOpinion.svelte'

  export let objectId: Ref<Doc>

  export let opinions: number

  const createApp = (): void => {
    showPopup(CreateOpinion, { review: objectId }, 'top')
  }
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={recruit.string.Opinions} />
    </span>
    <Button icon={IconAdd} kind={'ghost'} on:click={createApp} />
  </div>
  {#if opinions > 0}
    <Table
      _class={recruit.class.Opinion}
      config={['', 'value', 'description', '$lookup.modifiedBy']}
      query={{ attachedTo: objectId }}
      loadingProps={{ length: opinions }}
    />
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <div class="content-color">
        <FileDuo size={'large'} />
      </div>
      <div class="text-sm content-dark-color mt-2">
        <Label label={recruit.string.NoReviewForCandidate} />
      </div>
      <span class="text-sm content-color over-underline" on:click={createApp}>
        <Label label={recruit.string.CreateAnReview} />
      </span>
    </div>
  {/if}
</div>
