<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import QRCode from 'qrcode'
  import { getCurrentAccount } from '@hcengineering/core'
  import { OK, unknownError, getEmbeddedLabel } from '@hcengineering/platform'
  import setting from '@hcengineering/setting'
  import { Breadcrumb, Button, EditBox, Header, Label, Spinner, Status } from '@hcengineering/ui'
  import { getAccountClient } from '../utils'
  import presentation from '@hcengineering/presentation'

  let tfaEnabled: boolean | undefined = undefined
  let showSetup = false
  let secret = ''
  let otpauthUrl = ''
  let code = ''
  let status = OK
  let isLoading = false

  const acc = getCurrentAccount()

  getAccountClient()
    .getAccountInfo(acc.uuid)
    .then((account) => {
      tfaEnabled = account.tfaEnabled
    })

  async function toggle2fa () {
    if (tfaEnabled) {
      // Logic for disabling (needs code)
      showSetup = true
    } else {
      isLoading = true
      try {
        const result = await getAccountClient().generate2faSecret()
        secret = result.secret
        otpauthUrl = result.url
        showSetup = true
      } catch (err: any) {
        status = err.status ?? unknownError(err)
      } finally {
        isLoading = false
      }
    }
  }

  async function verifyAndEnable () {
    isLoading = true
    try {
      await getAccountClient().enable2fa(secret, code)
      tfaEnabled = true
      showSetup = false
      code = ''
      status = OK
    } catch (err: any) {
      status = err.status ?? unknownError(err)
    } finally {
      isLoading = false
    }
  }

  async function verifyAndDisable () {
    isLoading = true
    try {
      await getAccountClient().disable2fa(code)
      tfaEnabled = false
      showSetup = false
      code = ''
      status = OK
    } catch (err: any) {
      status = err.status ?? unknownError(err)
    } finally {
      isLoading = false
    }
  }

  let qrCodeUrl = ''

  $: if (otpauthUrl) {
    QRCode.toDataURL(otpauthUrl, { margin: 1, width: 200 }).then((url) => {
      qrCodeUrl = url
    })
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Password} label={setting.string.TwoFactorAuth} size="large" isCurrent />
  </Header>

  <div class="flex-col p-6 gap-8 max-w-2xl">
    <div class="flex flex-between">
      <Label label={setting.string.TwoFactorAuthDescription} />
      {#if tfaEnabled === undefined}
        <Spinner />
      {:else}
        <Button
          label={tfaEnabled ? setting.string.DisableTwoFactorAuth : setting.string.EnableTwoFactorAuth}
          kind={tfaEnabled ? 'negative' : 'primary'}
          on:click={toggle2fa}
          disabled={isLoading || showSetup}
        />
      {/if}
    </div>

    {#if showSetup}
      <div class="flex-col flex-gap-6 mt-6">
        {#if !tfaEnabled}
          <div class="flex-col items-center flex-gap-1">
            <div style="width: 200px; height: 200px">
              <img src={qrCodeUrl} alt="2FA QR Code" width="200" height="200" />
            </div>
            <div class="font-mono break-all">
              {secret}
            </div>
          </div>
        {/if}

        <div class="flex mt-4 items-center flex-gap-4">
          <Label label={setting.string.EnterVerificationCode} />:
          <EditBox
            bind:value={code}
            kind={'default-large'}
            maxWidth={'80px'}
            placeholder={getEmbeddedLabel('000000')}
            autoFocus
          />
          <Button
            label={presentation.string.Save}
            kind="primary"
            size="large"
            on:click={tfaEnabled ? verifyAndDisable : verifyAndEnable}
            disabled={isLoading || code.length !== 6}
          />
          <Status {status} />
        </div>
      </div>
    {/if}
  </div>
</div>
