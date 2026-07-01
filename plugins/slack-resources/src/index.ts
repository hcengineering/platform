//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { type Resources } from '@hcengineering/platform'

import Configure from './components/Configure.svelte'
import IconSlack from './components/icons/Slack.svelte'

export default async (): Promise<Resources> => ({
  component: {
    Connect: Configure,
    Configure,
    IconSlack
  },
  handler: {
    DisconnectHandler: async (): Promise<void> => {},
    DisconnectAllHandler: async (): Promise<void> => {}
  }
})
