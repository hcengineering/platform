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
  import type { State } from '@anticrm/core'

  export let value: State

  const bgColor: string = '#7C6FCD'
</script>

<div class="state-container" style="background-color: {bgColor}">
  {value.label}
</div>

<style lang="scss">
  .state-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: .375rem 1rem;
    width: min-content;
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: .5px;
    font-size: .625rem;
    color: #fff;
    border: 1px solid rgba(0, 0, 0, .1);
    border-radius: .5rem;
  }
</style>
