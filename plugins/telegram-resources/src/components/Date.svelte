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
  import type { SharedTelegramMessage } from '@hcengineering/telegram'

  export let message: SharedTelegramMessage

  const current = new Date()
  const target = new Date(message.sendOn)
  let options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long'
  }
  if (current.getFullYear() !== target.getFullYear()) {
    options = {
      ...options,
      year: '2-digit'
    }
  }
</script>

<div class="datetime-container">
  {new Intl.DateTimeFormat('default', options).format(message.sendOn)}
</div>

<style lang="scss">
  .datetime-container {
    justify-self: center;
    margin: 0.3rem auto;
    padding: 0.25rem 0.75rem;
    width: fit-content;
    font-weight: 500;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-default);
    border-radius: 1.25rem;
    user-select: text;
  }
</style>
