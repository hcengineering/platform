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
  import { Icon } from '@hcengineering/ui'

  import contact from '@hcengineering/contact'

  export let localTime: string
</script>

<div class="time-container">
  <div class="clock-icon">
    <Icon icon={contact.icon.Clock} size={'small'} />
  </div>
  <div class="time-text">
    <span class="time-text-span">{localTime}</span>
  </div>
</div>

<style>
  .time-text-span {
    color: var(--text-2, #b9babd);
    font-size: 14px;
    font-family: 'Inter Display', sans-serif;
    font-weight: 400;
    line-height: 18px;
    word-wrap: break-word;
  }

  .time-text {
    justify-content: center;
    display: flex;
    flex-direction: column;
  }

  .clock-icon {
    width: 14px;
    height: 14px;
    position: relative;
  }

  .time-container {
    justify-content: flex-start;
    align-items: center;
    gap: 4px;
    display: inline-flex;
  }
</style>
