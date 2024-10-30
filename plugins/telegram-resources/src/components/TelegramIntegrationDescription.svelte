<!--
// Copyright © 2024 Hardcore Engineering Inc.
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

  import telegram from '../plugin'
</script>

<div class="flex-col flex-gap-1 max-w-100">
  <Label label={telegram.string.TelegramIntegrationDesc} />
  <br />
  <Label label={telegram.string.TelegramIntegrationDesc2} />
  <span class="mt-3">
    <Label label={telegram.string.ToSetupNotification} />
  </span>
  <span class="fs-bold">
    <Label label={telegram.string.TelegramNotificationPath} />
  </span>
</div>
