// Copyright © 2026 Krang / Subfracture
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0

import type { Class, Doc, Ref } from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

/**
 * Agent operational mode
 * @public
 */
export type AgentMode = 'watching' | 'active' | 'autonomous'

/**
 * Agent message role
 * @public
 */
export type AgentMessageRole = 'user' | 'agent' | 'system'

/**
 * Agent message in conversation
 * @public
 */
export interface AgentMessage {
  id: string
  role: AgentMessageRole
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * Agent session state
 * @public
 */
export interface AgentSession extends Doc {
  mode: AgentMode
  messages: AgentMessage[]
  context?: {
    objectId?: Ref<Doc>
    objectClass?: Ref<Class<Doc>>
    path?: string[]
  }
  createdAt: number
  updatedAt: number
}

/**
 * @public
 */
export const aiAgentId = 'ai-agent' as Plugin

/**
 * @public
 */
const aiAgentPlugin = plugin(aiAgentId, {
  class: {
    AgentSession: '' as Ref<Class<AgentSession>>
  },
  icon: {
    Agent: '' as Asset,
    Watching: '' as Asset,
    Active: '' as Asset,
    Autonomous: '' as Asset
  },
  component: {
    AgentWidget: '' as AnyComponent,
    AgentPanel: '' as AnyComponent,
    ModeSelector: '' as AnyComponent,
    MessageList: '' as AnyComponent,
    ChatInput: '' as AnyComponent
  },
  string: {
    Agent: '' as IntlString,
    AgentWidget: '' as IntlString,
    Watching: '' as IntlString,
    Active: '' as IntlString,
    Autonomous: '' as IntlString,
    AskAgent: '' as IntlString,
    Thinking: '' as IntlString,
    Connected: '' as IntlString,
    Disconnected: '' as IntlString,
    Reconnecting: '' as IntlString
  },
  function: {
    SendMessage: '' as Resource<(message: string) => Promise<void>>,
    SetMode: '' as Resource<(mode: AgentMode) => Promise<void>>
  }
})

export default aiAgentPlugin
