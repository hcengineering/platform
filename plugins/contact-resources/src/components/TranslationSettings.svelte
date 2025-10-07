<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import core, { Data } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Breadcrumb, Header, Label, Toggle } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import view from '@hcengineering/view'
  import { getCurrentEmployee, Translation } from '@hcengineering/contact'

  import contact from '../plugin'
  import LanguageEditor from './LanguageEditor.svelte'
  import LanguagesArrayEditor from './LanguagesArrayEditor.svelte'
  import { translationStore } from '../translation'

  const client = getClient()
  const me = getCurrentEmployee()

  let settings: Translation | undefined = undefined

  $: settings = $translationStore
  $: enabled = settings?.enabled ?? false

  async function toggle (data: Partial<Data<Translation>>): Promise<void> {
    if (settings != null) {
      await client.update(settings, data)
    } else {
      await client.createDoc(contact.class.Translation, core.space.Workspace, {
        attachedTo: me,
        enabled: false,
        dontTranslate: [],
        ...data
      })
    }
  }

  async function changeEnable (): Promise<void> {
    enabled = !enabled
    await toggle({ enabled })
  }
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={view.icon.Translate} label={contact.string.AutoTranslation} size={'large'} isCurrent />
  </Header>
  <div class="flex-row-stretch flex-grow p-10">
    <div class="flex-grow flex-col flex-gap-4">
      <div class="flex-row-center flex-gap-4">
        <Label label={getEmbeddedLabel('Enabled')} />
        <Toggle on={enabled} on:change={changeEnable} />
      </div>
      <div class="flex-row-center flex-gap-4">
        <Label label={contact.string.TranslateTo} />
        <LanguageEditor
          disabled={!enabled}
          value={settings?.translateTo}
          on:change={(ev) => toggle({ translateTo: ev.detail ?? '' })}
        />
      </div>
      <div class="flex-row-center flex-gap-4">
        <Label label={contact.string.DontTranslate} />
        <LanguagesArrayEditor
          disabled={!enabled}
          selected={settings?.dontTranslate ?? []}
          on:change={(ev) => toggle({ dontTranslate: ev.detail ?? [] })}
        />
      </div>
    </div>
  </div>
</div>
