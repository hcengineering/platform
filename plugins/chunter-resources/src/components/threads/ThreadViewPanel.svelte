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
  import { Ref } from '@hcengineering/core'
  import { ActivityMessage } from '@hcengineering/activity'
  import { location as locationStore } from '@hcengineering/ui'

  import ThreadView from './ThreadView.svelte'

  export let _id: Ref<ActivityMessage>

  let selectedMessageId: Ref<ActivityMessage> | undefined = undefined

  locationStore.subscribe((newLocation) => {
    selectedMessageId = newLocation.query?.message as Ref<ActivityMessage> | undefined
  })
</script>

<div class="antiPanel-component">
  <ThreadView {_id} {selectedMessageId} on:close />
</div>
