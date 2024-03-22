<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Attachment } from '@hcengineering/attachment'

  export let attachments: Attachment[] = []
</script>

<div class="tooltip">
  {#each attachments as acc}
    <div>
      {acc.name}
    </div>
  {/each}
</div>

<style lang="scss">
  .tooltip {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding: var(--spacing-0_5);
  }
</style>
