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
  import { ActivityTypeUpdate } from '@hcengineering/communication-types'
  import card from '@hcengineering/card'
  import { getClient } from '@hcengineering/presentation'
  import { tooltip, IconEdit } from '@hcengineering/ui'

  import Icon from '../../Icon.svelte'
  import Label from '../../Label.svelte'
  import uiNext from '../../../plugin'

  export let update: ActivityTypeUpdate

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: clazz = hierarchy.getClass(update.newType)
</script>

<div class="flex-presenter overflow-label flex-gap-1 no-pointer no-word-wrap">
  <span class="mr-1"><Icon icon={IconEdit} size="small" /></span>
  <Label label={uiNext.string.Set} />
  <span class="lower">
    <Label label={card.string.MasterTag} />
    <Label label={uiNext.string.To} />
  </span>

  <div class="tag no-word-wrap" use:tooltip={{ label: clazz.label }}>
    <span class="overflow-label">
      <Label label={clazz.label} />
    </span>
  </div>
</div>

<style lang="scss">
  .tag {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--theme-content-color);
    max-width: 12.5rem;
    overflow: hidden;

    border-radius: 6rem;

    color: var(--theme-caption-color);

    display: flex;
    align-items: center;
  }
</style>
