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
  import { OK, setMetadata, Severity, Status } from '@hcengineering/platform'

  import { getCurrentLocation, navigate, setMetadataLocalStorage } from '@hcengineering/ui'
  import login from '../plugin'
  import { confirm } from '../utils'
  import presentation from '@hcengineering/presentation'
  import { onMount } from 'svelte'

  let status: Status<any> = OK

  function goToWorkspaces () {
    const loc = getCurrentLocation()
    loc.query = undefined
    loc.path[1] = 'selectWorkspace'
    loc.path.length = 2
    navigate(loc)
  }

  function goToLogin () {
    const loc = getCurrentLocation()
    loc.query = undefined
    loc.path[1] = 'login'
    loc.path.length = 2
    navigate(loc)
  }

  async function check () {
    const location = getCurrentLocation()
    if (location.query?.id === undefined || location.query?.id === null) return
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

    const [loginStatus, result] = await confirm(location.query?.id)

    status = loginStatus

    if (result !== undefined) {
      setMetadata(presentation.metadata.Token, result.token)
      setMetadataLocalStorage(login.metadata.LoginEndpoint, result.endpoint)
      setMetadataLocalStorage(login.metadata.LoginEmail, result.email)
      goToWorkspaces()
    } else {
      goToLogin()
    }
  }

  onMount(() => {
    check()
  })
</script>
