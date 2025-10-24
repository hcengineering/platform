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
  import { Card } from '@hcengineering/card'
  import { Message, SocialID } from '@hcengineering/communication-types'
  import { ExtendedMessagePreview } from '@hcengineering/communication-resources'
  import { isViewSettingEnabled, hideUserNamesSettingId, viewSettingsStore } from '../../settings'

  export let card: Card
  export let message: Message | undefined = undefined
  export let socialId: SocialID
  export let date: Date
  export let color: 'primary' | 'secondary' = 'primary'
  export let kind: 'default' | 'column' = 'default'
  export let padding: string | undefined = undefined
  export let hideHeader: boolean = false

  const hidePersonName = isViewSettingEnabled($viewSettingsStore, hideUserNamesSettingId)
</script>

<ExtendedMessagePreview {card} {message} {socialId} {date} {color} {kind} {padding} {hideHeader} {hidePersonName} />
