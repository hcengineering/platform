//
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
//

import { type CommandUid, type DrawingCmd } from './drawing'

export interface CommandsBufferAdapter {
  addCommand: (command: DrawingCmd) => void
  removeCommands: (fromInclusive: number) => void
  deleteCommand: (id: CommandUid) => number | undefined
  changeCommand: (command: DrawingCmd) => void
  getCommandCount: () => number

  setLastExecutedCommandPointer: (index: number | undefined) => void
  getLastExecutedCommandsPointer: () => number | undefined
}

export class DrawingCommandsProcessor {
  modified: boolean

  constructor (
    private readonly adapter: CommandsBufferAdapter,
    private readonly onCommandsChanged?: () => void
  ) {
    this.modified = false
  }

  private notifyCommandsChanged (): void {
    this.onCommandsChanged?.()
  }

  modificationConsumed (): void {
    this.modified = false
  }

  isModified (): boolean {
    return this.modified
  }

  canUndo (): boolean {
    const commandPointer = this.adapter.getLastExecutedCommandsPointer()

    return commandPointer !== undefined && commandPointer >= 0
  }

  canRedo (): boolean {
    const commandPointer = this.adapter.getLastExecutedCommandsPointer()
    const commandCount = this.adapter.getCommandCount()

    return commandPointer !== undefined && commandPointer < commandCount - 1
  }

  clear (): void {
    this.adapter.removeCommands(0)
    this.adapter.setLastExecutedCommandPointer(undefined)
    this.modified = true
    this.notifyCommandsChanged()
  }

  change (command: DrawingCmd): void {
    this.adapter.changeCommand(command)
    this.modified = true
  }

  delete (id: CommandUid): void {
    const deletedCommandIndex = this.adapter.deleteCommand(id)
    if (deletedCommandIndex === undefined) {
      return
    }
    const lastExecutedCommandIndex = this.adapter.getLastExecutedCommandsPointer()
    if (undefined !== lastExecutedCommandIndex && deletedCommandIndex <= lastExecutedCommandIndex) {
      this.adapter.setLastExecutedCommandPointer(lastExecutedCommandIndex - 1)
    }
    this.modified = true
    this.notifyCommandsChanged()
  }

  new (command: DrawingCmd): void {
    const commandPointer = this.adapter.getLastExecutedCommandsPointer()
    if (undefined !== commandPointer && commandPointer + 1 < this.adapter.getCommandCount()) {
      this.adapter.removeCommands(commandPointer + 1)
    }
    this.adapter.addCommand(command)
    this.adapter.setLastExecutedCommandPointer(this.adapter.getCommandCount() - 1)
    this.modified = true
    this.notifyCommandsChanged()
  }

  undo (): void {
    const commandPointer = this.adapter.getLastExecutedCommandsPointer()
    if (undefined !== commandPointer && commandPointer >= 0) {
      this.adapter.setLastExecutedCommandPointer(commandPointer - 1)
      this.modified = true
      this.notifyCommandsChanged()
    }
  }

  redo (): void {
    const commandPointer = this.adapter.getLastExecutedCommandsPointer()
    if (undefined !== commandPointer && commandPointer + 1 < this.adapter.getCommandCount()) {
      this.adapter.setLastExecutedCommandPointer(commandPointer + 1)
      this.modified = true
      this.notifyCommandsChanged()
    }
  }
}
