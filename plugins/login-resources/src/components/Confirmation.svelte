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
  import { onMount } from 'svelte'
  import { OK, Severity, Status } from '@hcengineering/platform'
  import { getCurrentLocation } from '@hcengineering/ui'
  import { logIn } from '@hcengineering/workbench'

  import login from '../plugin'
  import { afterConfirm, confirm, goTo } from '../utils'

  export let status: Status<any> = OK

  async function check (): Promise<void> {
    const location = getCurrentLocation()
    if (location.query?.id === undefined || location.query?.id === null) return
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

    const [loginStatus, result] = await confirm(location.query?.id)

    status = loginStatus

    if (result != null) {
      await logIn(result)
      await afterConfirm()
    } else {
      goTo('login')
    }
  }

  onMount(() => {
    void check()
  })
</script>
