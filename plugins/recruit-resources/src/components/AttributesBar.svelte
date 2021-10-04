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
  import { CircleButton, Label } from '@anticrm/ui'
  import Location from './icons/Location.svelte'
  import YesNoPresenter from './YesNoPresenter.svelte'

  export let minimize: boolean = false
</script>

<div class="flex-row-center small-text">
  <div class="icon-wrap column">
    <CircleButton icon={Location} size={'large'} />
    <div class="noicon-column">
      <Label label={'Location'} />
      <div class="value">Moscow</div>
    </div>
  </div>
  <div class="noicon-column column">
    <Label label={'Onsite'} />
    <YesNoPresenter state={'yes'} />
  </div>
  <div class="noicon-column column">
    <Label label={'Remote'} />
    <YesNoPresenter state={'no'} />
  </div>
</div>

<style lang="scss">
  .icon-wrap {
    display: flex;
    align-items: center;
  }
  .noicon-column {
    display: flex;
    flex-direction: column;
  }
  .icon-wrap .noicon-column { margin-left: .5rem; }
  .value {
    font-weight: 500;
    color: var(--theme-caption-color);
  }
  .column + .column {
    position: relative;
    margin-left: 3rem;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: -1.5rem;
      width: 1px;
      background-color: var(--theme-bg-accent-hover);
    }
  }
</style>