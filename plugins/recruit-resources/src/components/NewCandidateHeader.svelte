<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { MultipleDraftController } from '@hcengineering/presentation'
  import { Button, IconAdd, showPopup } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import recruit from '../plugin'
  import CreateCandidate from './CreateCandidate.svelte'

  let draftExists = false

  const draftController = new MultipleDraftController(recruit.mixin.Candidate)
  onDestroy(
    draftController.hasNext((res) => {
      draftExists = res
    })
  )

  async function newCandidate (): Promise<void> {
    showPopup(CreateCandidate, { shouldSaveDraft: true }, 'top')
  }
</script>

<div class="antiNav-subheader">
  <Button
    icon={IconAdd}
    label={draftExists ? recruit.string.ResumeDraft : recruit.string.CreateTalent}
    justify={'left'}
    kind={'accented'}
    width={'100%'}
    size={'large'}
    on:click={newCandidate}
  >
    <div slot="content" class="draft-circle-container">
      {#if draftExists}
        <div class="draft-circle" />
      {/if}
    </div>
  </Button>
</div>

<style lang="scss">
  .draft-circle-container {
    margin-left: auto;
  }

  .draft-circle {
    height: 6px;
    width: 6px;
    background-color: var(--primary-bg-color);
    border-radius: 50%;
  }
</style>
