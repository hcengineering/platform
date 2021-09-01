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
  import { EditBox } from '@anticrm/ui'
</script>

<div class="popup">
  <div class="popup-block">
    <span>Contact</span>
    <EditBox label={'Phone'} placeholder={'+7 (000) 000-00-00'} />
    <EditBox label={'Email'} placeholder={'rosamund.chen@gmail.com'} />
  </div>
  <div class="popup-block">
    <span>SOCIAL LINKS</span>
    <EditBox label={'Twitter'} placeholder={'@rosychen'} />
    <EditBox label={'Facebook'} placeholder={'facebook/rosamundch'} />
  </div>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1.25rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0px 1.25rem 3.75rem rgba(0, 0, 0, .6);

    &-block {
      display: grid;
      grid-auto-flow: row;
      row-gap: .75rem;

      span {
        font-weight: 600;
        font-size: 0.625rem;
        color: var(--theme-caption-color);
        text-transform: uppercase;
      }
    }
  }
  .popup-block + .popup-block {
    margin-top: 2rem;
  }
</style>
