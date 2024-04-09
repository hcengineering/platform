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
  import ToggleWithLabel from "@hcengineering/ui/src/components/ToggleWithLabel.svelte"
  export let filter: 'all' | 'unread' = 'all'
  function toggle (on?: boolean) {
    filter = on ? 'unread' : 'all'
  }
</script>

<div class="toggle-wrapper">
  <ToggleWithLabel 
    label={"Unread"}
    on:change={(e) => toggle(e.detail)}
  />
</div>

<style lang="scss">
  .toggle-wrapper {
    width: fit-content;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: .5rem;
  }
</style>

