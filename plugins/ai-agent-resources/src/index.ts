// Copyright © 2026 Krang / Subfracture
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0

import { type Resources } from '@hcengineering/platform'

import AgentWidget from './components/AgentWidget.svelte'
import AgentPanel from './components/AgentPanel.svelte'
import ModeSelector from './components/ModeSelector.svelte'
import MessageList from './components/MessageList.svelte'
import ChatInput from './components/ChatInput.svelte'

export default async (): Promise<Resources> => ({
  component: {
    AgentWidget,
    AgentPanel,
    ModeSelector,
    MessageList,
    ChatInput
  }
})
