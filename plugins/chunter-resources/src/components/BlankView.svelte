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
  import { Icon, Label } from '@hcengineering/ui'
  import { Asset, IntlString } from '@hcengineering/platform'

  export let icon: Asset
  export let header: IntlString
  export let label: IntlString | undefined = undefined
</script>

<div class="root">
  <Icon {icon} size="large" />
  <div class="an-element__label header">
    <Label label={header} />
  </div>
  {#if label}
    <span class="an-element__label">
      <Label {label} />
    </span>
  {/if}
</div>

<style lang="scss">
  .root {
    display: flex;
    align-self: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: 100%;
    width: 30rem;
  }

  .header {
    font-weight: 600;
    margin: 1rem;
  }
</style>
