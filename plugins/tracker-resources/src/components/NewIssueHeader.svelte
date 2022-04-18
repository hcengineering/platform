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
  import { Ref, Space } from '@anticrm/core'
  import { Button, showPopup } from '@anticrm/ui'
  import tracker from '../plugin'
  import CreateIssue from './CreateIssue.svelte'
  export let currentSpace: Ref<Space>

  async function newIssue (target: EventTarget | null): Promise<void> {
    showPopup(CreateIssue, { space: currentSpace }, 'top')
  }
</script>

<div class="antiNav-subheader gap-2">
  <div class="flex-grow text-md">
    <Button
      icon={tracker.icon.NewIssue}
      label={tracker.string.NewIssue}
      justify={'left'}
      width={'100%'}
      on:click={() => newIssue(null)}
    />
  </div>
  <Button icon={tracker.icon.Magnifier} on:click={async () => {}} />
</div>
