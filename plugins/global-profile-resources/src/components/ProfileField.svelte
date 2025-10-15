<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import type { IntlString } from '@hcengineering/platform'
  import { EditBox, Label } from '@hcengineering/ui'
  import globalProfile from '@hcengineering/global-profile'

  export let value: string
  export let label: IntlString
  export let placeholder: IntlString
  export let maxLength: number
  export let required: boolean = false
  export let showCounter: boolean = false
  export let format: 'text' | 'text-multiline' | 'password' | undefined = undefined

  $: charCount = value?.length ?? 0
  $: exceedsLimit = charCount > maxLength
  $: isEmpty = required && value.trim() === ''
</script>

<div class="field">
  <EditBox bind:value {placeholder} {label} kind="default" {format} fullSize {required} />
  <div class="field-info">
    {#if isEmpty}
      <span class="error-message">
        <Label label={globalProfile.string.Required} />
      </span>
    {:else if exceedsLimit}
      <span class="error-message">
        <Label label={globalProfile.string.MaximumLength} params={{ count: maxLength }} />
      </span>
    {/if}
    {#if showCounter}
      <div class="counter" class:error={exceedsLimit}>
        {charCount}/{maxLength}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }

  .error-message {
    color: var(--theme-error-color);
  }

  .counter {
    color: var(--theme-dark-color);
    margin-left: auto;

    &.error {
      color: var(--theme-error-color);
    }
  }
</style>
