<!--
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
-->

<script lang="ts">
  import { IntlString } from '@hcengineering/platform'
  import DocumentInfoLabel from './DocumentInfoLabel.svelte'

  export let label: IntlString
</script>

<div class="flex flex-gap-1 min-h-8 items-center w-full">
  <div class="label">
    <DocumentInfoLabel {label} />
  </div>
  <div class="field">
    <slot />
  </div>
</div>

<style lang="scss">
  .label {
    flex-basis: 38%;
    flex-shrink: 0;
  }
  .field {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    min-width: 0;
  }
</style>
