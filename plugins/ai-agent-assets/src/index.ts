//
// Copyright © 2026 Krang / Subfracture
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0

import aiAgent from '@hcengineering/ai-agent'
import { loadMetadata } from '@hcengineering/platform'

const icons = require('../assets/icons.svg') as string // eslint-disable-line

loadMetadata(aiAgent.icon, {
  Agent: `${icons}#agent`,
  Watching: `${icons}#agent`,
  Active: `${icons}#agent`,
  Autonomous: `${icons}#agent`
})
