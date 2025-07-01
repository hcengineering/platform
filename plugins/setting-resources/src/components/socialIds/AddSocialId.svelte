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
  import { createEventDispatcher } from 'svelte'
  import { SocialIdentityProvider } from '@hcengineering/contact'
  import { ModernDialog } from '@hcengineering/ui'
  import { getCurrentLanguage } from '@hcengineering/theme'
  import { IntlString, translate } from '@hcengineering/platform'

  import setting from '../../plugin'

  export let provider: SocialIdentityProvider
  export let canSubmit: boolean = false
  export let hideSubmit: boolean = true
  export let submitLabel: IntlString = setting.string.Add
  export let onSubmit: () => void | Promise<void> = () => {}

  const dispatch = createEventDispatcher()

  let typeString: string
  $: void translate(provider.label, {}, getCurrentLanguage()).then((s) => {
    typeString = s
  })

  async function handleClose (): Promise<void> {
    dispatch('close')
  }

  async function handleSubmit (): Promise<void> {
    await onSubmit()
  }
</script>

<ModernDialog
  label={setting.string.AddNew}
  labelProps={{ type: typeString }}
  {submitLabel}
  {canSubmit}
  {hideSubmit}
  on:submit={handleSubmit}
  on:close={handleClose}
>
  <slot />
</ModernDialog>

<style lang="scss">
</style>
