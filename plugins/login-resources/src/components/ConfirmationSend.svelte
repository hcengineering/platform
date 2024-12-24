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
  import { Label } from '@hcengineering/ui'
  import { onMount } from 'svelte'
  import login from '../plugin'
  import { afterConfirm, getAccount } from '../utils'

  const CHECK_INTERVAL = 1000
  let checkHandle: number | undefined
  let mounted = false

  async function checkAccountStatus (): Promise<void> {
    const loginInfo = await getAccount(false)

    if (loginInfo?.token != null) {
      await afterConfirm()
    }
  }

  async function check (): Promise<void> {
    try {
      await checkAccountStatus()
    } catch (e) {
      // we should be able to continue from this state
    }

    if (mounted) {
      checkHandle = setTimeout(check, CHECK_INTERVAL)
    }
  }

  onMount(() => {
    mounted = true
    void check()

    return () => {
      mounted = false
      if (checkHandle != null) {
        clearTimeout(checkHandle)
        checkHandle = undefined
      }
    }
  })
</script>

<div class="flex-center h-full p-10 caption-color">
  <div class="flex-col-center text-center">
    <h4>
      <Label label={login.string.ConfirmationSent} />
    </h4>
    <Label label={login.string.ConfirmationSent2} />
  </div>
</div>
