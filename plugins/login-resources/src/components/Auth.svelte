<script lang="ts">
  import { onMount } from 'svelte'
  import { getCurrentLocation, Loading } from '@hcengineering/ui'
  import { logIn } from '@hcengineering/workbench'
  import { trackOAuthCompletion } from '@hcengineering/analytics-providers'
  import { type LoginInfoRequest, type LoginInfoByToken } from '@hcengineering/account-client'
  import { OK, PlatformError, unknownError } from '@hcengineering/platform'

  import type { Field } from '../types'
  import {
    afterConfirm,
    getLoginInfoFromQuery,
    getAutoJoinInfo,
    goTo,
    isWorkspaceLoginInfo,
    navigateToWorkspace,
    isLoginInfoRequest
  } from '../utils'
  import Form from './Form.svelte'
  import login from '../plugin'

  let request: LoginInfoRequest | undefined
  let fields: Field[]
  $: fields =
    request != null
      ? [
          { id: 'first_name', name: 'firstName', i18n: login.string.FirstName },
          { id: 'last_name', name: 'lastName', i18n: login.string.LastName, optional: true }
        ]
      : []
  const formData = {
    firstName: '' as string,
    lastName: '' as string
  }

  onMount(async () => {
    const autoJoinInfo = getAutoJoinInfo()
    if (autoJoinInfo != null) {
      goTo('autoJoin')
      return
    }

    const result = await getLoginInfoFromQuery()

    trackOAuthCompletion(result)
    await handleLoginInfo(result)
  })

  async function handleLoginInfo (result: LoginInfoByToken): Promise<void> {
    if (result == null) {
      goTo('login', true)
    } else if (isLoginInfoRequest(result)) {
      request = result
    } else {
      await logIn(result)

      if (isWorkspaceLoginInfo(result)) {
        navigateToWorkspace(result.workspaceUrl, result, getCurrentLocation().query?.navigateUrl, true)
        return
      }

      await afterConfirm(true)
    }
  }

  let status = OK

  const action = {
    i18n: login.string.Proceed,
    func: async () => {
      try {
        const result = await getLoginInfoFromQuery(formData)
        await handleLoginInfo(result)
      } catch (err: any) {
        if (err instanceof PlatformError) {
          status = err.status
        } else {
          status = unknownError(err)
        }
      }
    }
  }
</script>

{#if request != null}
  <Form caption={login.string.WhatIsYourName} {status} {fields} object={formData} {action} ignoreInitialValidation />
{:else}
  <Loading />
{/if}
