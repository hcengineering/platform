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
  import AttributeEditor from './AttributeEditor.svelte'

  export let minimize: boolean = false
</script>

<div class="flex-row-center small-text">
  <div class="column">
    <AttributeEditor icon={Location} label={'Location'} component={Label} props={{ label: 'Moscow' }} />
  </div>
  <div class="column">
    <AttributeEditor label={'Onsite'} component={YesNoPresenter} props={{ state: 'yes' }} />
  </div>
  <div class="column">
    <AttributeEditor label={'Remote'} component={YesNoPresenter} props={{ state: 'no' }} />
  </div>
</div>

<style lang="scss">
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