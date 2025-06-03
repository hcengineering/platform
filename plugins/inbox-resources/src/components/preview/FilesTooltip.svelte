<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { File } from '@hcengineering/communication-types'

  export let files: File[] = []
</script>

<div class="tooltip">
  {#each files as file}
    <div>
      {file.filename}
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
