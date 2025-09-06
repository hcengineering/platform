<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { ExecutionLog, ExecutionLogAction } from '@hcengineering/process'
  import { addNotification, NotificationSeverity, themeStore } from '@hcengineering/ui'
  import { translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import process from '../plugin'
  import { Ref } from '@hcengineering/core'
  import ExecutionNotification from './ExecutionNotification.svelte'

  const processed = new Set<Ref<ExecutionLog>>()
  const client = getClient()
  let init = false

  const query = createQuery()
  query.query(process.class.ExecutionLog, { createdOn: { $gt: Date.now() } }, (res) => {
    if (!init) {
      res.forEach((event) => {
        processed.add(event._id)
      })
      init = true
    } else {
      notifyAll(res)
    }
  })

  async function notifyAll (events: ExecutionLog[]): Promise<void> {
    for (const event of events) {
      if (processed.has(event._id)) continue
      await notify(event)
    }
  }

  async function notify (event: ExecutionLog): Promise<void> {
    processed.add(event._id)
    const _process = client.getModel().findObject(event.process)
    addNotification(
      await translate(
        event.action === ExecutionLogAction.Started
          ? process.string.Started
          : event.action === ExecutionLogAction.Transition
            ? process.string.Transition
            : process.string.Rollback,
        {},
        $themeStore.language
      ),
      _process?.name ?? (await translate(process.string.Process, {}, $themeStore.language)),
      ExecutionNotification,
      {
        event
      },
      event.action === ExecutionLogAction.Rollback ? NotificationSeverity.Warning : NotificationSeverity.Info,
      event.execution
    )
  }
</script>
