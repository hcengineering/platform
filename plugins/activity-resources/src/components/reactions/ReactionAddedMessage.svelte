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
  import { Reaction } from '@hcengineering/activity'
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'

  import activity from '../../plugin'

  export let _id: Ref<Reaction>
  export let value: Reaction | undefined = undefined

  const query = createQuery()

  $: value === undefined &&
    query.query(activity.class.Reaction, { _id }, (res) => {
      value = res[0]
    })
</script>

<span class="labels-row gap-1">
  {value?.emoji}
</span>
