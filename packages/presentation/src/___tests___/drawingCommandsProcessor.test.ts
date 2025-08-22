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

import { type CommandsBufferAdapter, DrawingCommandsProcessor } from '../drawingCommandsProcessor'
import { type CommandUid, type DrawingCmd, makeCommandUid } from '../drawing'

describe('DrawingCommandsProcessor', () => {
  let systemUnderTest: DrawingCommandsProcessor
  let spyCommands: DrawingCmd[]
  let spyPointer: number | undefined

  function makeDummyCommand (): DrawingCmd {
    return { id: '1' as CommandUid, type: 'line' }
  }

  beforeEach(() => {
    spyCommands = []
    spyPointer = undefined
    const adapter: CommandsBufferAdapter = {
      addCommand: (cmd: DrawingCmd) => {
        spyCommands.push(cmd)
      },
      removeCommands: (fromInclusive: number) => {
        spyCommands.splice(fromInclusive)
      },
      getCommandCount: () => {
        return spyCommands.length
      },
      setLastExecutedCommandPointer: (index: number | undefined) => {
        spyPointer = index
      },
      getLastExecutedCommandsPointer: () => {
        return spyPointer
      },
      changeCommand: function (command: DrawingCmd): void {
        const i = spyCommands.findIndex(c => c.id === command.id)
        if (i >= 0) {
          spyCommands[i] = command
        }
      },
      deleteCommand: function (id: CommandUid): number | undefined {
        const i = spyCommands.findIndex(c => c.id === id)
        if (i >= 0) {
          spyCommands.splice(i, 1)
          return i
        }
      }
    }
    systemUnderTest = new DrawingCommandsProcessor(adapter)
  })

  it('construction', () => {
    expect(systemUnderTest.isModified()).toBe(false)
  })

  it('clear', () => {
    spyCommands.push(makeDummyCommand())
    spyCommands.push(makeDummyCommand())
    spyCommands.push(makeDummyCommand())
    spyPointer = 1

    systemUnderTest.clear()

    expect(spyCommands.length).toBe(0)
    expect(spyPointer).toBeUndefined()
    expect(systemUnderTest.isModified()).toBe(true)
  })

  it('new, when no commands', () => {
    const command = makeDummyCommand()

    systemUnderTest.new(command)

    expect(spyCommands.length).toBe(1)
    expect(spyCommands[0]).toBe(command)
    expect(spyPointer).toBe(0)
    expect(systemUnderTest.isModified()).toBe(true)
  })

  it('new when can\'t redo', () => {
    const firstCommand = makeDummyCommand()
    spyCommands.push(firstCommand)
    spyPointer = 0
    const newCommand = makeDummyCommand()

    systemUnderTest.new(newCommand)

    expect(spyCommands.length).toBe(2)
    expect(spyCommands[0]).toBe(firstCommand)
    expect(spyCommands[1]).toBe(newCommand)
    expect(spyPointer).toBe(1)
    expect(systemUnderTest.isModified()).toBe(true)
  })

  it('new when can redo', () => {
    const firstCommand = makeDummyCommand()
    spyCommands.push(firstCommand)
    const secondCommand = makeDummyCommand()
    spyCommands.push(secondCommand)
    spyPointer = 0
    const newCommand = makeDummyCommand()

    systemUnderTest.new(newCommand)

    expect(spyCommands.length).toBe(2)
    expect(spyCommands[0]).toBe(firstCommand)
    expect(spyCommands[1]).toBe(newCommand)
    expect(spyPointer).toBe(1)
    expect(systemUnderTest.isModified()).toBe(true)
  })

  it('undo', () => {
    const firstCommand = makeDummyCommand()
    spyCommands.push(firstCommand)
    const secondCommand = makeDummyCommand()
    spyCommands.push(secondCommand)
    spyPointer = 1

    systemUnderTest.undo()

    expect(spyCommands.length).toBe(2)
    expect(spyCommands[0]).toBe(firstCommand)
    expect(spyCommands[1]).toBe(secondCommand)
    expect(spyPointer).toBe(0)
    expect(systemUnderTest.isModified()).toBe(true)
  })

  it('undo, when spy pointer undefined', () => {
    systemUnderTest.undo()

    expect(spyCommands.length).toBe(0)
    expect(spyPointer).toBeUndefined()
    expect(systemUnderTest.isModified()).toBe(false)
  })

  it('undo, when no commands', () => {
    spyPointer = -1

    systemUnderTest.undo()

    expect(spyCommands.length).toBe(0)
    expect(spyPointer).toBe(-1)
    expect(systemUnderTest.isModified()).toBe(false)
  })

  it('redo', () => {
    const firstCommand = makeDummyCommand()
    spyCommands.push(firstCommand)
    const secondCommand = makeDummyCommand()
    spyCommands.push(secondCommand)
    spyPointer = -1

    systemUnderTest.redo()

    expect(spyCommands.length).toBe(2)
    expect(spyCommands[0]).toBe(firstCommand)
    expect(spyCommands[1]).toBe(secondCommand)
    expect(spyPointer).toBe(0)
    expect(systemUnderTest.isModified()).toBe(true)
  })

  it('redo, when spy pointer undefined', () => {
    systemUnderTest.redo()

    expect(spyCommands.length).toBe(0)
    expect(spyPointer).toBeUndefined()
    expect(systemUnderTest.isModified()).toBe(false)
  })

  it('redo, when nothing to redo', () => {
    spyCommands.push(makeDummyCommand())
    spyPointer = 0

    systemUnderTest.redo()

    expect(spyCommands.length).toBe(1)
    expect(systemUnderTest.isModified()).toBe(false)
  })

  it('modificationConsumed', () => {
    systemUnderTest.clear()
    systemUnderTest.modificationConsumed()
    expect(systemUnderTest.isModified()).toBe(false)
  })

  describe('makeCommandId', () => {
    it('should return a string', () => {
      const id = makeCommandUid()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('should return unique values', () => {
      const id1 = makeCommandUid()
      const id2 = makeCommandUid()
      expect(id1).not.toBe(id2)
    })
  })

  // Add tests for storeTextCommand and other drawing logic here
})
