//
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
//

import { Timestamp } from '@hcengineering/core'

export class Limiter {
  // Bot should not send more than 30 messages per second, but we will limit it to 25 just to be safe
  maxMsgPerTime = 25
  timeLimit = 1000

  sentMsg = 0
  clearTimeLimitOn: Timestamp = Date.now()

  // Bot should not send more than 20 messages  per minute to the same chat
  chatTimeLimit = 60 * 1000
  maxMsgPerChat = 20

  clearChatLimitOn: Timestamp = Date.now()
  sentMsgByChat = new Map<number, number>()

  constructor () {
    setInterval(() => {
      this.sentMsg = 0
      this.clearTimeLimitOn = Date.now() + this.timeLimit
    }, this.timeLimit)

    setInterval(() => {
      this.sentMsgByChat.clear()
      this.clearChatLimitOn = Date.now() + this.chatTimeLimit
    }, this.chatTimeLimit)
  }

  async exec<T>(op: () => Promise<T>): Promise<void> {
    while (this.sentMsg >= this.maxMsgPerTime) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(Date.now() - this.clearTimeLimitOn), 10))
    }

    this.sentMsg++

    try {
      await op()
    } catch (e) {
      console.error(e)
    }
  }

  async add<T>(telegramId: number, op: () => Promise<T>): Promise<void> {
    await this.updateChatLimits(telegramId)

    if (this.sentMsg >= this.maxMsgPerTime) {
      await new Promise((resolve) => setTimeout(resolve, this.maxMsgPerTime))
    }

    void this.exec(op)
  }

  async updateChatLimits (telegramId: number): Promise<void> {
    let counts = this.sentMsgByChat.get(telegramId) ?? 0

    while (counts >= this.maxMsgPerChat) {
      if (counts >= this.maxMsgPerChat) {
        await this.waitChatLimits()
      }

      counts = this.sentMsgByChat.get(telegramId) ?? 0
    }

    this.sentMsgByChat.set(telegramId, counts + 1)
  }

  async waitChatLimits (): Promise<void> {
    const now = Date.now()
    const diff = Math.max(this.clearChatLimitOn - now, 0)

    await new Promise((resolve) => setTimeout(resolve, diff))
  }
}
