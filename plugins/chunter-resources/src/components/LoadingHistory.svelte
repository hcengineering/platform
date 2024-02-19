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
  import { Label } from '@hcengineering/ui'

  import chunter from '../plugin'

  export let isLoading = false
</script>

<div class="loader">
  {#if isLoading}
    <Label label={chunter.string.LoadingHistory} />
  {/if}
</div>

<style lang="scss">
  .loader {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--global-secondary-TextColor);
    font-weight: 500;
    height: 5rem;
    min-height: 5rem;
  }
</style>
