<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { Applicant } from '@anticrm/recruit'
  import type { TxCreateDoc } from '@anticrm/core'
  import { TxProcessor } from '@anticrm/core'
  import ApplicationPresenter from '../ApplicationPresenter.svelte'

  export let tx: TxCreateDoc<Applicant>
</script>

<ApplicationPresenter value={TxProcessor.createDoc2Doc(tx)}/>