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

import { makeCommandUid, type CommandUid, type DrawingCmd } from './drawingCommand'
import { type Array as YArray, type Doc as YDoc, UndoManager as YUndoManager } from 'yjs'

export class UndoRedoAvailability {
  constructor (
    private readonly disableUndo: boolean,
    private readonly disableRedo: boolean
  ) {}

  get undoDisabled (): boolean {
    return this.disableUndo
  }

  get redoDisabled (): boolean {
    return this.disableRedo
  }
}

export class DrawingCommandsProcessor {
  private readonly document: YDoc
  private readonly commands: YArray<DrawingCmd>
  private readonly undoManager: YUndoManager

  private readonly UndoableOperationMarker = 137

  constructor (document: YDoc, backend: YArray<DrawingCmd>) {
    this.document = document
    this.commands = backend
    this.undoManager = new YUndoManager(backend, {
      trackedOrigins: new Set([this.UndoableOperationMarker]),
      captureTimeout: 0
    })
  }

  set (commands: DrawingCmd[]): void {
    this.document.transact(() => {
      this.removeAllCommands()
      for (const command of commands) {
        this.commands.push([command])
      }
    })
    this.undoManager.clear()
  }

  getUndoRedoAvailability (): UndoRedoAvailability {
    const disableUndo = !this.undoManager.canUndo()
    const disableRedo = !this.undoManager.canRedo()
    return new UndoRedoAvailability(disableUndo, disableRedo)
  }

  snapshot (): DrawingCmd[] {
    return this.commands.toArray()
  }

  undo (): void {
    this.undoManager.undo()
  }

  redo (): void {
    this.undoManager.redo()
  }

  clear (): void {
    this.document.transact(() => {
      this.removeAllCommands()
    }, this.UndoableOperationMarker)
  }

  ensureAllCommandsWithUids (): void {
    this.document.transact(() => {
      let anyLacksId = false
      for (let i = 0; i < this.commands.length; i++) {
        if (this.commands.get(i).id === undefined) {
          anyLacksId = true
          break
        }
      }
      if (anyLacksId) {
        const snapshot = this.commands.toArray()
        this.removeAllCommands()
        this.commands.push(snapshot.map((x: DrawingCmd) => ({ ...x, id: x.id ?? makeCommandUid() })))
      }
    })
  }

  addCommand (target: DrawingCmd): void {
    this.document.transact(() => {
      this.commands.push([target])
    }, this.UndoableOperationMarker)
  }

  deleteCommand (id: CommandUid): void {
    this.document.transact(() => {
      for (let i = 0; i < this.commands.length; i++) {
        if (this.commands.get(i).id === id) {
          this.commands.delete(i)
          break
        }
      }
    }, this.UndoableOperationMarker)
  }

  changeCommand (newOne: DrawingCmd): void {
    this.document.transact(() => {
      let index = -1
      for (let i = 0; i < this.commands.length; i++) {
        if (this.commands.get(i).id === newOne.id) {
          this.commands.delete(i)
          index = i
          break
        }
      }
      if (index >= 0) {
        this.commands.insert(index, [newOne])
      } else {
        this.commands.push([newOne])
      }
    }, this.UndoableOperationMarker)
  }

  private removeAllCommands (): void {
    this.commands.delete(0, this.commands.length)
  }
}
