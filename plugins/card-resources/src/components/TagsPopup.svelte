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
  import { Tag } from '@hcengineering/card'
  import CardTagColored from './CardTagColored.svelte'

  export let tags: Array<Tag> = []
</script>

<div class="flex-col flex-gap-2">
  {#each tags as tag}
    <CardTagColored labelIntl={tag.label} color={tag.background} />
  {/each}
</div>
