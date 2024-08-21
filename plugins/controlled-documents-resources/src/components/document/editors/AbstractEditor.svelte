<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Document } from '@hcengineering/controlled-documents'
  import { getClient } from '@hcengineering/presentation'
  import { EditBox } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import plugin from '../../../plugin'

  export let value: Document | undefined
  export let readonly = true

  const client = getClient()

  $: abstract = value?.abstract

  const handleUpdateAbstract = () => {
    if (readonly) {
      return
    }

    if (value === undefined || value === null) {
      return
    }

    if (value.abstract === abstract) {
      return
    }

    client.update(value, { abstract }, true)
  }
</script>

{#if value}
  <EditBox
    value={abstract}
    disabled={readonly}
    placeholder={readonly ? view.string.LabelNA : plugin.string.AbstractPlaceholder}
    fullSize
    on:value={(event) => {
      abstract = event.detail
    }}
    on:blur={handleUpdateAbstract}
  />
{/if}
