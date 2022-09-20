<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Vacancy } from '@hcengineering/recruit'
  import { TimeSince } from '@hcengineering/ui'

  export let value: Vacancy
  export let applications: Map<Ref<Vacancy>, { count: number; modifiedOn: number }> | undefined
</script>

<TimeSince value={Math.max(applications?.get(value._id)?.modifiedOn ?? 0, value.modifiedOn)} />
