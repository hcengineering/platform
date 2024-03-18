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
  export let label: string
</script>

<button class="hulyToDoLine-reference flex-row-top flex-no-shrink flex-gap-2" on:click>
  <div class="hulyToDoLine-icon">
    <slot name="icon" />
  </div>
  <span class="hulyToDoLine-label overflow-label font-medium-12 text-left max-w-20 secondary-textColor">
    {label}
  </span>
  <slot />
</button>

<style lang="scss">
  button {
    margin: 0;
    padding: 0;
    text-align: left;
    border: none;
    outline: none;
  }
</style>
