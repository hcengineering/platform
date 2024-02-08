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
  import type { Backlink } from '@hcengineering/chunter'
  import { createQuery, MessageViewer } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'

  import chunter from '../plugin'

  export let _id: Ref<Backlink> | undefined = undefined
  export let value: Backlink | undefined = undefined

  const query = createQuery()

  $: value === undefined &&
    _id &&
    query.query(chunter.class.Backlink, { _id }, (res) => {
      value = res[0]
    })
</script>

{#if value}
  <div class="root">
    <MessageViewer message={value.message} />
  </div>
{/if}

<style lang="scss">
  .root {
    display: inline-block;
    color: var(--global-primary-TextColor);
  }
</style>
