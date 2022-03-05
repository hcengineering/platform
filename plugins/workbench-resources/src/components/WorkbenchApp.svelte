<!--
// Copyright © 2020 Anticrm Platform Contributors.
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

import { getMetadata, getResource } from '@anticrm/platform'
import type { Client } from '@anticrm/core'
import core from '@anticrm/core'
import { setCurrentAccount } from '@anticrm/core'
import { navigate, Loading, fetchMetadataLocalStorage, setMetadataLocalStorage } from '@anticrm/ui'

import client from '@anticrm/client'
import login from '@anticrm/login'
import contact from '@anticrm/contact'

import Workbench from './Workbench.svelte'
import workbench from '../plugin'

let versionError: string | undefined = ''

async function connect (): Promise<Client | undefined> {
  const token = fetchMetadataLocalStorage(login.metadata.LoginToken)
  const endpoint = fetchMetadataLocalStorage(login.metadata.LoginEndpoint)
  const email = fetchMetadataLocalStorage(login.metadata.LoginEmail)

  if (token === null || endpoint === null || email === null) {
    navigate({ path: [login.component.LoginApp] })
    return
  }

  const getClient = await getResource(client.function.GetClient)
  const instance = await getClient(token, endpoint)
  console.log('logging in as', email)

  const me = await instance.findOne(contact.class.EmployeeAccount, { email })
  if (me !== undefined) {
    console.log('login: employee account', me)
    setCurrentAccount(me)
  } else {
    console.error('WARNING: no employee account found.')
    setMetadataLocalStorage(login.metadata.LoginToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    navigate({ path: [login.component.LoginApp] })
    return
  }

  try {
    console.log('checking model version')
    const version = await instance.findOne(core.class.Version, {})
    console.log('Model version', version)

    const requirdVersion = getMetadata(workbench.metadata.RequiredVersion)
    if (requirdVersion !== undefined) {
      console.log('checking min model version', requirdVersion)
      const versionStr = `${version?.major}.${version?.minor}.${version?.patch}`

      if (version === undefined || requirdVersion !== versionStr) {
        versionError = `${versionStr} => ${requirdVersion}`
        return undefined
      }
    }
  } catch (err: any) {
    console.log(err)
    const requirdVersion = getMetadata(workbench.metadata.RequiredVersion)
    console.log('checking min model version', requirdVersion)
    if (requirdVersion !== undefined) {
      versionError = `'unknown' => ${requirdVersion}`
      return undefined
    }
  }

  return instance
}

</script>

{#await connect()}
  <Loading/>
{:then client}
  {#if !client && versionError}
    <div class='antiPopup version-popup'>
      <h1>Server is under maintenance.</h1>
      {versionError}
    </div>
  {:else}
    <Workbench {client}/>
  {/if}
{:catch error}
  <div>{error} -- {error.stack}</div>
{/await}

<style lang="scss">
  .version-popup {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    left: 25%;
    right: 25%;
    top: 25%;
    bottom: 25%;
  }
</style>