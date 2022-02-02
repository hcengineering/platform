<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import type { SharedTelegramMessage } from '@anticrm/telegram'

  export let message: SharedTelegramMessage
</script>

<div class="datetime-container">
  {new Intl.DateTimeFormat('default', { day: 'numeric', month: 'long' }).format(message.modifiedOn)}
</div>

<style lang="scss">
  .datetime-container {
    justify-self: center;
    margin: 0.3rem 0;
    padding: 0.25rem 0.75rem;
    width: fit-content;
    color: var(--theme-content-accent-color);
    background-color: var(--theme-menu-divider);
    border-radius: 1.25rem;
  }
</style>
