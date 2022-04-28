<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  // status: 'active', 'dnd', 'busy', 'away'
  export let status: string = 'away'
</script>

<div class="flex-center {status}" style="min-height: 2rem;" on:click|stopPropagation={() => {}}>
  <div class="status" />
</div>

<style lang="scss">
  .status {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
  .active .status {
    background-color: var(--activity-status-active);
  }
  .dnd .status {
    background-color: var(--activity-status-dnd);
  }
  .busy .status {
    background-color: var(--activity-status-busy);
  }
  .away .status {
    background-color: var(--activity-status-away);
  }
</style>
