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
  import { Card } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'

  export let value: string

  const dispatch = createEventDispatcher()
  export let maxHeight: string = '40vh'
  const checkValue = (evt: CustomEvent): void => {
    const res: string | undefined = evt.detail === null ? undefined : evt.detail
    if (value !== res && res != null) {
      dispatch('change', res)
      value = res
    }
  }
</script>

<Card
  label={view.string.MarkupEditor}
  canSave={true}
  okLabel={view.string.Save}
  okAction={() => {
    dispatch('close', value)
  }}
  on:close={() => dispatch('close', null)}
  on:changeContent
>
  <div class="flex-grow mt-4">
    <StyledTextBox autofocus content={value} alwaysEdit mode={2} hideExtraButtons {maxHeight} on:value={checkValue} />
  </div>
</Card>
