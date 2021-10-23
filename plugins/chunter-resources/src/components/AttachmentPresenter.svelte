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
  import type { Attachment } from '@anticrm/chunter'

  export let value: Attachment

  const maxLenght: number = 16
  const trimFilename = (fname: string): string => (fname.length > maxLenght)
                        ? fname.substr(0, (maxLenght - 1) / 2) + '...' + fname.substr(-(maxLenght - 1) / 2)
                        : fname
</script>

<div class="flex-row-center">
  <div class="flex-center icon">PDF</div>
  <div class="flex-col">
    <div class="caption-color">{trimFilename(value.name)}</div>
    <div class="type">{value.type}</div>
  </div>
</div>

<style lang="scss">
  .icon {
    flex-shrink: 0;
    margin-right: 1.25rem;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    font-size: .625rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-enabled);
    border: 1px solid rgba(0, 0, 0, .1);
    border-radius: .5rem;
  }
  .type {
    font-size: .75rem;
    color: var(--theme-content-dark-color);
  }
</style>
