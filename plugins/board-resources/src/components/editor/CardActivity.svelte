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
  import activity from '@anticrm/activity'
  import type { Card } from '@anticrm/board'
  import chunter from '@anticrm/chunter'
  import { Button, Component, Icon, IconActivity, Label } from '@anticrm/ui'
  import board from '../../plugin'

  export let value: Card | undefined
  let isActivityShown: boolean = true
</script>

{#if value !== undefined}
  <div class="flex-col-stretch h-full w-full">
    <div class="flex-row-stretch mt-4 mb-2">
      <div class="w-9">
        <Icon icon={IconActivity} size="large" />
      </div>
      <div class="flex-grow fs-title">
        <Label label={activity.string.Activity} />
      </div>
      <Button
        kind="no-border"
        label={isActivityShown ? board.string.HideDetails : board.string.ShowDetails}
        width="100px"
        on:click={() => {
          isActivityShown = !isActivityShown
        }}
      />
    </div>
    <div class="flex-row-stretch">
      <div class="w-9" />
      <div class="w-full">
        <Component is={chunter.component.CommentInput} props={{ object: value }} />
      </div>
    </div>
    {#if isActivityShown === true}
      <Component is={activity.component.Activity} props={{ object: value, showCommenInput: false, transparent: true }}>
        <slot />
      </Component>
    {/if}
  </div>
{/if}
