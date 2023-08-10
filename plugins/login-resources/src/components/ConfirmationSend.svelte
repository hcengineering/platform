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
  import { Label, getCurrentLocation, navigate } from '@hcengineering/ui'
  import login from '../plugin'
  import { getAccount } from '../utils'
  import { onMount } from 'svelte'

  const CHECK_INTERVAL = 1000

  async function checkAccountStatus () {
    const account = await getAccount()
    if (account?.confirmed === true) {
      const loc = getCurrentLocation()
      loc.path[1] = 'selectWorkspace'
      loc.path.length = 2
      navigate(loc)
    }
  }

  let weAreHere = false

  async function check () {
    try {
      await checkAccountStatus()
    } catch (e) {
      // we should be able to continue from this state
    }
    if (weAreHere) {
      setTimeout(check, CHECK_INTERVAL)
    }
  }

  onMount(() => {
    weAreHere = true
    check()
    return () => {
      weAreHere = false
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
