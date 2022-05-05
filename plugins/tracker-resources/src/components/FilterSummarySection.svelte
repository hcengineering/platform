<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { Button, IconClose } from '@anticrm/ui'

  import { getIssueFilterAssetsByType } from '../utils'
  import tracker from '../plugin'

  export let type: string = ''
  export let selectedFilters: any[] = []
  export let onDelete: () => void
</script>

<div class="root">
  <div class="buttonWrapper">
    <Button shape={'rectangle-right'} {...getIssueFilterAssetsByType(type)} />
  </div>
  <div class="buttonWrapper">
    <Button
      shape="rectangle"
      label={selectedFilters.length < 2 ? tracker.string.FilterIs : tracker.string.FilterIsEither}
    />
  </div>
  <div class="buttonWrapper">
    <Button
      shape={'rectangle'}
      label={tracker.string.FilterStatesCount}
      labelParams={{ value: selectedFilters.length }}
    />
  </div>
  <div class="buttonWrapper">
    <Button shape={'rectangle-left'} icon={IconClose} on:click={onDelete} />
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    align-items: center;
  }

  .buttonWrapper {
    margin-right: 1px;

    &:last-child {
      margin-right: 0;
    }
  }
</style>
