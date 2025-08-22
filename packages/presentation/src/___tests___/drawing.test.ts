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

import '@testing-library/jest-dom'

import { makeCommandUid, drawing } from '../drawing'
import type { DrawTextCmd, CommandUid, DrawingCommands, DrawingTool, DrawingProps, DrawingCmd } from '../drawing'

const fakeCanvasContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  strokeText: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 50 })),
  save: jest.fn(),
  restore: jest.fn(),
  reset: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  setTransform: jest.fn(),
  transform: jest.fn(),
  createLinearGradient: jest.fn(),
  createRadialGradient: jest.fn(),
  createPattern: jest.fn(),
  arc: jest.fn(),
  arcTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  closePath: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
  isPointInPath: jest.fn(),
  drawImage: jest.fn(),
  putImageData: jest.fn(),
  getImageData: jest.fn(),
  createImageData: jest.fn(),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  strokeStyle: '#000000',
  fillStyle: '#000000',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  lineDashOffset: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  direction: 'inherit'
}

describe('drawing module tests', () => {
  describe('utilities tests', () => {
    describe('makeCommandUid', () => {
      it('id length', () => {
        const uid = makeCommandUid()
        expect(uid.length).toBeGreaterThan(0)
      })

      it('values uniqueness', () => {
        const first = makeCommandUid()
        const second = makeCommandUid()
        expect(first).not.toBe(second)
      })
    })
  })

  describe('drawing factory function tests', () => {
    function prepareFakeCanvas (): void {
      HTMLCanvasElement.prototype.getContext = jest.fn(() => fakeCanvasContext) as any

      (globalThis as any).ResizeObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn()
      }))
    }

    let drawingPlugInPoint: HTMLElement

    beforeEach(() => {
      prepareFakeCanvas()

      jest.useFakeTimers()

      drawingPlugInPoint = document.createElement('div')
      document.body.appendChild(drawingPlugInPoint)

      jest.clearAllMocks()
    })

    afterEach(() => {
      jest.useRealTimers()

      if (drawingPlugInPoint.parentNode != null) {
        drawingPlugInPoint.parentNode.removeChild(drawingPlugInPoint)
      }
    })

    it('create a drawing board', () => {
      const drawingBoard = drawing(drawingPlugInPoint, {
        readonly: false,
        imageWidth: 40,
        imageHeight: 40,
        drawing: { commands: [], lastExecutedCommand: undefined }
      })

      expect(drawingBoard).toBeDefined()
    })

    describe('text editing', () => {
      const DefaultPenColor: string = 'red'
      const DefaultTool: DrawingTool = 'pen'
      const EmptyCommandUid = '' as CommandUid
      const DefaultDrawingBoardWidth = 200
      const DefaultDrawingBoardHeight = 200

      const createTextCommandStub = (overrides: Partial<DrawTextCmd> = {}
      ): { textCommandUid: CommandUid, textCommand: DrawTextCmd } => {
        const textCommandUid = makeCommandUid()
        const textCommand: DrawTextCmd = {
          id: textCommandUid,
          type: 'text',
          text: 'hello',
          pos: { x: 10, y: 10 },
          fontSize: 12,
          fontFace: '"IBM Plex Sans"',
          color: 'green',
          ...overrides
        }
        return { textCommandUid, textCommand }
      }

      const createDrawingBoard = (
        existingTextCommand: DrawTextCmd | undefined,
        overrides: Partial<Parameters<typeof drawing>[1]> = {}
      ): { drawingBoard: ReturnType<typeof drawing>, initialState: DrawingProps } => {
        const commands: DrawingCommands =
          existingTextCommand === undefined
            ? { commands: [], lastExecutedCommand: undefined }
            : { commands: [existingTextCommand], lastExecutedCommand: 0 }

        const initialState = {
          readonly: false,
          imageWidth: DefaultDrawingBoardWidth,
          imageHeight: DefaultDrawingBoardHeight,
          drawing: commands,
          penColor: DefaultPenColor,
          tool: DefaultTool,
          ...overrides
        }
        return { drawingBoard: drawing(drawingPlugInPoint, initialState), initialState }
      }

      const findContentEditableElement = (container: Element): Element | null => {
        const allDivs = container.querySelectorAll('div')
        for (let i = 0; i < allDivs.length; i++) {
          const div = allDivs[i] as HTMLElement
          if (div.contentEditable === 'true') {
            return div
          }
        }
        return null
      }

      const isLiveTextEditorPresent = (container: Element): boolean => {
        return findContentEditableElement(container) !== null
      }

      const setTextEditorText = (container: Element, text: string): void => {
        const editor = findContentEditableElement(container)
        if (editor != null) {
          const editorElement = editor as HTMLElement
          editorElement.innerText = text
        }
      }

      const getTextEditorColor = (container: Element): string | null => {
        const editor = findContentEditableElement(container)
        if (editor != null) {
          const editorElement = editor as HTMLElement
          const color = editorElement.style.color
          return color !== '' ? color : null
        }
        return null
      }

      const sendCtrlEnterToTextEditor = (container: Element): void => {
        const editor = findContentEditableElement(container)
        if (editor != null) {
          const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
          })
          editor.dispatchEvent(event)
        }
      }

      it('changing color for text editor', () => {
        const commandAddedSpy = jest.fn()
        const { drawingBoard, initialState: boardState } = createDrawingBoard(undefined, { cmdAdded: commandAddedSpy })

        {
          const colorToSet = 'blue'
          // simulating: user selected text tool
          drawingBoard.update?.({ ...boardState, tool: 'text' })
          // simulating: user selected a color
          drawingBoard.update?.({ ...boardState, tool: 'text', penColor: colorToSet })
          // simulating: user clicked somewhere on the board
          drawingBoard.update?.({ ...boardState, tool: 'text', penColor: colorToSet, changingCmdId: EmptyCommandUid })

          expect(getTextEditorColor(drawingPlugInPoint)).toBe(colorToSet)
        }

        // change color to something else
        {
          const colorToSet = 'blue'
          drawingBoard.update?.({ ...boardState, tool: 'text', penColor: colorToSet, changingCmdId: EmptyCommandUid })
          expect(getTextEditorColor(drawingPlugInPoint)).toBe(colorToSet)
        }

        const lastSetColor = 'red'
        drawingBoard.update?.({ ...boardState, tool: 'text', penColor: lastSetColor, changingCmdId: EmptyCommandUid })
        expect(getTextEditorColor(drawingPlugInPoint)).toBe(lastSetColor)

        const setTextContent = 'New Text In The Box'
        setTextEditorText(drawingPlugInPoint, setTextContent)

        // new tool selection - editor should have been closed
        drawingBoard.update?.({ ...boardState, tool: 'pen', penColor: lastSetColor, changingCmdId: EmptyCommandUid })
        // changing color for the pen
        drawingBoard.update?.({ ...boardState, tool: 'pen', penColor: 'magenta', changingCmdId: undefined })

        setTextEditorText(drawingPlugInPoint, setTextContent + setTextContent)

        // The storeTextCommand uses a deferred notify (setTimeout). Flush timers to execute it.
        jest.runOnlyPendingTimers()

        // created text command should have correct color and text
        const storedTextDrawCommand = commandAddedSpy.mock.calls[0][0] as DrawTextCmd | undefined
        expect(storedTextDrawCommand).toBeDefined()
        expect(storedTextDrawCommand?.color).toBe(lastSetColor)
        expect(storedTextDrawCommand?.text).toBe(setTextContent)
      })

      it('commit text editing by changing tool', () => {
        const commandChangedSpy = jest.fn()
        const commandAddedSpy = jest.fn()

        const { drawingBoard, initialState: boardState } = createDrawingBoard(undefined, {
          cmdChanged: commandChangedSpy,
          cmdAdded: commandAddedSpy
        })

        // simulating: user selected text tool
        drawingBoard.update?.({ ...boardState, tool: 'text' })
        // simulating: user clicked somewhere on the board, starting new text editing
        drawingBoard.update?.({ ...boardState, tool: 'text', changingCmdId: EmptyCommandUid })

        // editor should be present in the DOM
        expect(isLiveTextEditorPresent(drawingPlugInPoint)).toBe(true)
        expect(getTextEditorColor(drawingPlugInPoint)).toBe(boardState.penColor)

        const setTextContent = 'New Text In The Box'
        setTextEditorText(drawingPlugInPoint, setTextContent)

        // changing tool
        drawingBoard.update?.({ ...boardState, tool: 'pen', changingCmdId: EmptyCommandUid })

        // The storeTextCommand uses a deferred notify (setTimeout). Flush timers to execute it.
        jest.runOnlyPendingTimers()

        // editor should be removed
        expect(isLiveTextEditorPresent(drawingPlugInPoint)).toBe(false)
        expect(getTextEditorColor(drawingPlugInPoint)).toBeNull()

        // commandAdded should have been called once
        expect(commandChangedSpy).toHaveBeenCalledTimes(0)
        expect(commandAddedSpy).toHaveBeenCalledTimes(1)

        // new command should have passed to the delegate
        const newlyCreatedTextDrawCommand = commandAddedSpy.mock.calls[0][0] as (DrawingCmd | undefined)
        expect(newlyCreatedTextDrawCommand).toBeDefined()
        expect(newlyCreatedTextDrawCommand?.type).toBe('text')

        // further actions should not create additional commandChanged / commandAdded calls
        drawingBoard.update?.({ ...boardState, tool: 'erase', changingCmdId: undefined })
        drawingBoard.update?.({ ...boardState, tool: 'text', changingCmdId: undefined })
        drawingBoard.update?.({ ...boardState, tool: 'text', changingCmdId: EmptyCommandUid })

        jest.runOnlyPendingTimers()
        expect(commandChangedSpy).toHaveBeenCalledTimes(0)
        expect(commandAddedSpy).toHaveBeenCalledTimes(1)
      })

      it('editing existing text', () => {
        const commandChangedSpy = jest.fn()
        const commandAddedSpy = jest.fn()

        const { textCommandUid, textCommand } = createTextCommandStub()

        const { drawingBoard, initialState: boardState } = createDrawingBoard(textCommand, {
          cmdChanged: commandChangedSpy,
          cmdAdded: commandAddedSpy
        })

        // simulating: user selected text tool
        drawingBoard.update?.({ ...boardState, tool: 'text' })
        // simulating: user clicked on the existing text
        drawingBoard.update?.({ ...boardState, tool: 'text', changingCmdId: textCommandUid, penColor: textCommand.color })

        // editor should be present in the DOM
        expect(isLiveTextEditorPresent(drawingPlugInPoint)).toBe(true)
        expect(getTextEditorColor(drawingPlugInPoint)).toBe(textCommand.color)

        const newText = 'New Text'
        setTextEditorText(drawingPlugInPoint, newText)

        const newColor = 'yellow'
        drawingBoard.update?.({ ...boardState, tool: 'text', changingCmdId: textCommandUid, penColor: newColor })

        // commit text editing
        sendCtrlEnterToTextEditor(drawingPlugInPoint)

        // The storeTextCommand uses a deferred notify (setTimeout). Flush timers to execute it.
        jest.runOnlyPendingTimers()

        // editor should be removed
        expect(isLiveTextEditorPresent(drawingPlugInPoint)).toBe(false)
        expect(getTextEditorColor(drawingPlugInPoint)).toBeNull()

        // commandChangedSpy should have been called once
        expect(commandChangedSpy).toHaveBeenCalledTimes(1)
        expect(commandAddedSpy).toHaveBeenCalledTimes(0)

        // new command should have passed to the delegate
        const changedCommand = commandChangedSpy.mock.calls[0][0] as (DrawTextCmd | undefined)
        expect(changedCommand).toBeDefined()
        expect(changedCommand?.type).toBe('text')
        expect(changedCommand?.text).toBe(newText)
        expect(changedCommand?.color).toBe(newColor)
      })
    })
  })
})
