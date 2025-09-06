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

import { DrawingCommandsProcessor, UndoRedoAvailability } from '../drawingCommandsProcessor'
import { makeCommandUid, type DrawingCmd, type DrawTextCmd, type DrawLineCmd } from '../drawingCommand'
import { type Array as YArray, Doc as YDoc } from 'yjs'
import { type ColorMetaNameOrHex, makeCanvasPoint } from '../drawingUtils'

const makeTextCommand = (overrides: Partial<DrawTextCmd> = {}): DrawTextCmd => ({
  id: makeCommandUid(),
  type: 'text',
  text: 'Default Text',
  pos: makeCanvasPoint(13, 17),
  fontSize: 11,
  fontFace: 'Arial',
  color: 'red' as ColorMetaNameOrHex,
  ...overrides
})

const makeLineCommand = (overrides: Partial<DrawLineCmd> = {}): DrawLineCmd => ({
  id: makeCommandUid(),
  type: 'line',
  lineWidth: 3,
  erasing: false,
  penColor: 'blue' as ColorMetaNameOrHex,
  points: [makeCanvasPoint(1, 3), makeCanvasPoint(11, 13)],
  ...overrides
})

describe('DrawingCommandsProcessor Tests', () => {
  let document: YDoc
  let commands: YArray<DrawingCmd>
  let systemUnderTest: DrawingCommandsProcessor

  beforeEach(() => {
    document = new YDoc()
    commands = document.getArray<DrawingCmd>('test-commands')
    systemUnderTest = new DrawingCommandsProcessor(document, commands)
  })

  afterEach(() => {
    document.destroy()
  })

  describe('UndoRedoAvailability', () => {
    it.each([
      { undoDisabled: true, redoDisabled: false },
      { undoDisabled: true, redoDisabled: true },
      { undoDisabled: false, redoDisabled: false },
      { undoDisabled: false, redoDisabled: true }
    ])(
      'construction test with undoDisabled = $undoDisabled, redoDisabled = $redoDisabled',
      ({ undoDisabled, redoDisabled }) => {
        const availability = new UndoRedoAvailability(undoDisabled, redoDisabled)
        expect(availability.undoDisabled).toBe(undoDisabled)
        expect(availability.redoDisabled).toBe(redoDisabled)
      }
    )
  })

  describe('after construction', () => {
    it('snapshot', () => {
      expect(systemUnderTest.snapshot()).toEqual([])
    })

    it('undo/redo availability', () => {
      const availability = systemUnderTest.getUndoRedoAvailability()
      expect(availability.undoDisabled).toBe(true)
      expect(availability.redoDisabled).toBe(true)
    })
  })

  describe('after set', () => {
    it('undo/redo availability', () => {
      const testCommands: DrawingCmd[] = [makeTextCommand(), makeLineCommand()]

      systemUnderTest.set(testCommands)

      const availability = systemUnderTest.getUndoRedoAvailability()
      expect(availability.undoDisabled).toBe(true)
      expect(availability.redoDisabled).toBe(true)
    })

    it('snapshot', () => {
      const initialCommands: DrawingCmd[] = [makeTextCommand()]
      const newCommands: DrawingCmd[] = [makeLineCommand()]

      systemUnderTest.set(initialCommands)
      systemUnderTest.set(newCommands)

      expect(systemUnderTest.snapshot()).toEqual(newCommands)
      expect(systemUnderTest.snapshot()).not.toEqual(initialCommands)
    })
  })

  describe('addCommand', () => {
    it('single invocation', () => {
      const command = makeTextCommand()

      systemUnderTest.addCommand(command)

      expect(systemUnderTest.snapshot()).toContain(command)
      expect(systemUnderTest.getUndoRedoAvailability().undoDisabled).toBe(false)
    })

    it('multiple invocations', () => {
      const first = makeTextCommand()
      const second = makeLineCommand()

      systemUnderTest.addCommand(first)
      systemUnderTest.addCommand(second)

      expect(systemUnderTest.snapshot()).toEqual([first, second])
    })
  })

  describe('deleteCommand', () => {
    it('existing command deletion', () => {
      const toBeDeleted = makeTextCommand()
      const toBeKept = makeLineCommand()

      systemUnderTest.addCommand(toBeDeleted)
      systemUnderTest.addCommand(toBeKept)
      systemUnderTest.deleteCommand(toBeDeleted.id)

      expect(systemUnderTest.snapshot()).toEqual([toBeKept])
    })

    it('non-existent command deletion', () => {
      const command = makeTextCommand()

      systemUnderTest.addCommand(command)

      const nonExistentId = makeCommandUid()
      systemUnderTest.deleteCommand(nonExistentId)

      expect(systemUnderTest.snapshot()).toEqual([command])
    })

    it('undo/redo availability', () => {
      const command = makeTextCommand()

      systemUnderTest.addCommand(command)
      systemUnderTest.deleteCommand(command.id)

      expect(systemUnderTest.getUndoRedoAvailability().undoDisabled).toBe(false)
    })
  })

  describe('changeCommand', () => {
    it('existing command change', () => {
      const originalCommand = makeTextCommand({
        text: 'Original',
        color: 'red' as ColorMetaNameOrHex
      })

      const changedCommand: DrawTextCmd = {
        ...originalCommand,
        text: 'Changed',
        color: 'blue' as ColorMetaNameOrHex
      }

      systemUnderTest.addCommand(originalCommand)
      systemUnderTest.changeCommand(changedCommand)

      expect(systemUnderTest.snapshot()).toEqual([changedCommand])
    })

    it('absent command change', () => {
      const newCommand = makeTextCommand()

      systemUnderTest.changeCommand(newCommand)

      expect(systemUnderTest.snapshot()).toEqual([newCommand])
    })

    it('order preservation', () => {
      const first = makeTextCommand({
        text: 'First',
        color: 'red' as ColorMetaNameOrHex
      })

      const second = makeTextCommand({
        text: 'Second',
        pos: makeCanvasPoint(20, 20),
        color: 'blue' as ColorMetaNameOrHex
      })

      const third = makeTextCommand({
        text: 'Third',
        pos: makeCanvasPoint(30, 30),
        color: 'green' as ColorMetaNameOrHex
      })

      systemUnderTest.addCommand(first)
      systemUnderTest.addCommand(second)
      systemUnderTest.addCommand(third)

      const changedSecond: DrawTextCmd = {
        ...second,
        text: 'Second Changed'
      }

      systemUnderTest.changeCommand(changedSecond)

      expect(systemUnderTest.snapshot()).toEqual([first, changedSecond, third])
    })
  })

  describe('undo/redo', () => {
    it('addCommand undo', () => {
      const command = makeTextCommand()

      systemUnderTest.addCommand(command)
      systemUnderTest.undo()

      expect(systemUnderTest.snapshot().length).toBe(0)
    })

    it('addCommand undo, than redo', () => {
      const command = makeTextCommand()

      systemUnderTest.addCommand(command)
      systemUnderTest.undo()
      systemUnderTest.redo()

      expect(systemUnderTest.snapshot()).toEqual([command])
    })

    it('multiple undo/redo', () => {
      const first = makeTextCommand()
      const second = makeLineCommand()

      systemUnderTest.addCommand(first)
      systemUnderTest.addCommand(second)

      systemUnderTest.undo()
      expect(systemUnderTest.snapshot()).toEqual([first])

      systemUnderTest.undo()
      expect(systemUnderTest.snapshot()).toEqual([])

      systemUnderTest.redo()
      expect(systemUnderTest.snapshot()).toEqual([first])

      systemUnderTest.redo()
      expect(systemUnderTest.snapshot()).toEqual([first, second])
    })

    it('undo/redo availability reporting', () => {
      const command = makeTextCommand()

      let availability = systemUnderTest.getUndoRedoAvailability()
      expect(availability.undoDisabled).toBe(true)
      expect(availability.redoDisabled).toBe(true)

      systemUnderTest.addCommand(command)
      availability = systemUnderTest.getUndoRedoAvailability()
      expect(availability.undoDisabled).toBe(false)
      expect(availability.redoDisabled).toBe(true)

      systemUnderTest.undo()
      availability = systemUnderTest.getUndoRedoAvailability()
      expect(availability.undoDisabled).toBe(true)
      expect(availability.redoDisabled).toBe(false)

      systemUnderTest.redo()
      availability = systemUnderTest.getUndoRedoAvailability()
      expect(availability.undoDisabled).toBe(false)
      expect(availability.redoDisabled).toBe(true)
    })
  })

  describe('clear', () => {
    it('execution', () => {
      systemUnderTest.addCommand(makeTextCommand())
      systemUnderTest.addCommand(makeLineCommand())
      systemUnderTest.clear()

      expect(systemUnderTest.snapshot().length).toBe(0)
      expect(systemUnderTest.getUndoRedoAvailability().undoDisabled).toBe(false)
    })

    it('undo', () => {
      const command = makeTextCommand()

      systemUnderTest.addCommand(command)
      systemUnderTest.clear()
      systemUnderTest.undo()

      expect(systemUnderTest.snapshot()).toEqual([command])
    })
  })

  describe('ensureAllCommandsWithUids', () => {
    it('absent uids addition', () => {
      const commandWithoutUid = {
        type: 'text',
        text: 'No UID',
        pos: { x: 10, y: 10 },
        fontSize: 12,
        fontFace: 'Arial',
        color: 'red'
      } as any
      commands.push([commandWithoutUid])

      systemUnderTest.ensureAllCommandsWithUids()

      const snapshot = systemUnderTest.snapshot()
      expect(snapshot.length).toBe(1)
      expect(snapshot[0].id).toBeDefined()
      expect(typeof snapshot[0].id).toBe('string')
    })

    it('should preserve existing UIDs', () => {
      const existingUid = makeCommandUid()
      const commandWithUid = makeTextCommand({
        id: existingUid
      })
      commands.push([commandWithUid])

      systemUnderTest.ensureAllCommandsWithUids()

      expect(systemUnderTest.snapshot()).toEqual([commandWithUid])
    })

    it('should handle mixed commands with and without UIDs', () => {
      const existingUid = makeCommandUid()
      const commandWithUid = makeTextCommand({
        id: existingUid
      })

      const commandWithoutUid = {
        type: 'line',
        lineWidth: 2,
        erasing: false,
        penColor: 'blue',
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 20 }
        ]
      } as any

      commands.push([commandWithUid, commandWithoutUid])

      systemUnderTest.ensureAllCommandsWithUids()

      const snapshot = systemUnderTest.snapshot()
      expect(snapshot.length).toBe(2)
      expect(snapshot[0].id).toBe(existingUid)
      expect(snapshot[1].id).toBeDefined()
      expect(typeof snapshot[1].id).toBe('string')
    })
  })

  describe('snapshot', () => {
    it('consecutive executions', () => {
      const command = makeTextCommand()

      systemUnderTest.addCommand(command)

      const firstSnapshot = systemUnderTest.snapshot()
      const secondSnapshot = systemUnderTest.snapshot()

      expect(firstSnapshot).toEqual(secondSnapshot)
      expect(firstSnapshot).not.toBe(secondSnapshot)
    })
  })

  describe('integration tests', () => {
    it('complex workflow with all operations', () => {
      const textCommand = makeTextCommand()
      const lineCommand = makeLineCommand()

      systemUnderTest.addCommand(textCommand)
      systemUnderTest.addCommand(lineCommand)
      expect(systemUnderTest.snapshot().length).toBe(2)

      const changedTextCommand: DrawTextCmd = {
        ...textCommand,
        text: 'Changed Text',
        color: 'green' as ColorMetaNameOrHex
      }
      systemUnderTest.changeCommand(changedTextCommand)
      expect(systemUnderTest.snapshot()).toEqual([changedTextCommand, lineCommand])

      systemUnderTest.deleteCommand(lineCommand.id)
      expect(systemUnderTest.snapshot()).toEqual([changedTextCommand])

      systemUnderTest.undo()
      expect(systemUnderTest.snapshot()).toEqual([changedTextCommand, lineCommand])

      systemUnderTest.undo()
      expect(systemUnderTest.snapshot()).toEqual([textCommand, lineCommand])

      systemUnderTest.clear()
      expect(systemUnderTest.snapshot().length).toBe(0)

      systemUnderTest.undo()
      expect(systemUnderTest.snapshot()).toEqual([textCommand, lineCommand])
    })

    it('rapid command additions and deletions', () => {
      const commands: DrawTextCmd[] = []

      for (let i = 0; i < 10; i++) {
        const cmd = makeTextCommand({
          text: `Command ${i}`,
          pos: makeCanvasPoint(i * 10, i * 10),
          color: 'black' as ColorMetaNameOrHex
        })
        commands.push(cmd)
        systemUnderTest.addCommand(cmd)
      }

      expect(systemUnderTest.snapshot().length).toBe(10)

      for (let i = 0; i < commands.length; i += 2) {
        systemUnderTest.deleteCommand(commands[i].id)
      }

      expect(systemUnderTest.snapshot().length).toBe(5)

      for (let i = 0; i < 5; i++) {
        systemUnderTest.undo()
      }

      expect(systemUnderTest.snapshot().length).toBe(10)
    })

    it('multiple undo/redo cycles', () => {
      systemUnderTest.addCommand(makeTextCommand())
      systemUnderTest.addCommand(makeLineCommand())

      const initialSnapshot = systemUnderTest.snapshot()

      for (let cycle = 0; cycle < 3; cycle++) {
        systemUnderTest.undo()
        systemUnderTest.undo()
        systemUnderTest.undo()
        expect(systemUnderTest.snapshot().length).toBe(0)

        systemUnderTest.redo()
        systemUnderTest.redo()
        systemUnderTest.redo()
        expect(systemUnderTest.snapshot()).toEqual(initialSnapshot)
      }
    })

    it('set after undo/redo', () => {
      systemUnderTest.addCommand(makeTextCommand())
      systemUnderTest.undo()

      expect(systemUnderTest.getUndoRedoAvailability().redoDisabled).toBe(false)

      const newCommand = makeLineCommand()

      systemUnderTest.set([newCommand])

      const availability = systemUnderTest.getUndoRedoAvailability()
      expect(availability.undoDisabled).toBe(true)
      expect(availability.redoDisabled).toBe(true)
      expect(systemUnderTest.snapshot()).toEqual([newCommand])
    })
  })
})
