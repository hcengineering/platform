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
  import { ModernButton, showPopup } from '@hcengineering/ui'
  import telegram from '@hcengineering/telegram'

  import ConfigureBotPopup from './ConfigureBotPopup.svelte'

  export let enabled: boolean

  function configureBot (): void {
    showPopup(ConfigureBotPopup, {})
  }
</script>

{#if enabled}
  <div class="configure mt-2">
    <ModernButton label={telegram.string.Configure} kind="primary" size="small" on:click={configureBot} />
  </div>
{/if}

<style lang="scss">
  .configure {
    width: 9.5rem;
  }
</style>
