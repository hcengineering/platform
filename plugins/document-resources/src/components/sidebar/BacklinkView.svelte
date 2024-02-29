<!--
//
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
//
-->
<script lang="ts">
  import { Backlink } from '@hcengineering/chunter'
  import { MessageViewer } from '@hcengineering/presentation'
  import { TimeSince } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'

  export let value: Backlink
</script>

<div class="container flex-col flex-gap-2 flex-no-shrink">
  <div class="flex-between h-8">
    <div class="fs-bold overflow-label">
      <ObjectPresenter _class={value.backlinkClass} objectId={value.backlinkId} accent />
    </div>
    <div class="time">
      <TimeSince value={value.createdOn ?? value.modifiedOn} />
    </div>
  </div>
  <div class="flex-no-shrink">
    <MessageViewer message={value.message} />
  </div>
</div>

<style lang="scss">
  .container {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--theme-divider-color);
  }
  .time {
    font-size: 0.75rem;
    color: var(--theme-trans-color);
  }
</style>
