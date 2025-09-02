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

import { makeCommandUid, type CommandUid, type DrawTextCmd, type DrawingCmd } from '../drawingCommand'
import { ThemeAwareColor, type ColorsList } from '../drawingColors'
import { drawing, type DrawingTool, type DrawingProps } from '../drawing'
import { type ColorMetaNameOrHex, makeCanvasPoint } from '../drawingUtils'

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
      ;(globalThis as any).ResizeObserver = jest.fn().mockImplementation(() => ({
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
        colorsList: [['alpha', new ThemeAwareColor('red', 'yellow')]],
        readonly: false,
        getCurrentTheme: () => 'theme-light',
        subscribeOnThemeChange: () => {},
        imageWidth: 40,
        imageHeight: 40,
        commands: []
      })

      expect(drawingBoard).toBeDefined()
    })

    describe('text editing', () => {
      const DefaultPenColor: ColorMetaNameOrHex = 'red' as ColorMetaNameOrHex
      const DefaultTool: DrawingTool = 'pen'
      const EmptyCommandUid = '' as CommandUid
      const DefaultDrawingBoardWidth = 200
      const DefaultDrawingBoardHeight = 200

      const createTextCommandStub = (
        overrides: Partial<DrawTextCmd> = {}
      ): { textCommandUid: CommandUid, textCommand: DrawTextCmd } => {
        const textCommandUid = makeCommandUid()
        const textCommand: DrawTextCmd = {
          id: textCommandUid,
          type: 'text',
          text: 'hello',
          pos: makeCanvasPoint(10, 10),
          fontSize: 12,
          fontFace: '"IBM Plex Sans"',
          color: 'green' as ColorMetaNameOrHex,
          ...overrides
        }
        return { textCommandUid, textCommand }
      }

      const createDrawingBoard = (
        existingTextCommand: DrawTextCmd | undefined,
        overrides: Partial<Parameters<typeof drawing>[1]> = {}
      ): { drawingBoard: ReturnType<typeof drawing>, initialState: DrawingProps } => {
        const commands = existingTextCommand === undefined ? [] : [existingTextCommand]

        const colorsList: ColorsList = [['alpha', new ThemeAwareColor('red', 'yellow')]]
        const initialState: any = {
          colorsList,
          getCurrentTheme: () => 'theme-light',
          subscribeOnThemeChange: () => {},
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
          const colorToSet = 'blue' as ColorMetaNameOrHex
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
          const colorToSet = 'blue' as ColorMetaNameOrHex
          drawingBoard.update?.({ ...boardState, tool: 'text', penColor: colorToSet, changingCmdId: EmptyCommandUid })
          expect(getTextEditorColor(drawingPlugInPoint)).toBe(colorToSet)
        }

        const lastSetColor = 'red' as ColorMetaNameOrHex
        drawingBoard.update?.({ ...boardState, tool: 'text', penColor: lastSetColor, changingCmdId: EmptyCommandUid })
        expect(getTextEditorColor(drawingPlugInPoint)).toBe(lastSetColor)

        const setTextContent = 'New Text In The Box'
        setTextEditorText(drawingPlugInPoint, setTextContent)

        // new tool selection - editor should have been closed
        drawingBoard.update?.({ ...boardState, tool: 'pen', penColor: lastSetColor, changingCmdId: EmptyCommandUid })
        // changing color for the pen
        drawingBoard.update?.({
          ...boardState,
          tool: 'pen',
          penColor: 'magenta' as ColorMetaNameOrHex,
          changingCmdId: undefined
        })

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
        const newlyCreatedTextDrawCommand = commandAddedSpy.mock.calls[0][0] as DrawingCmd | undefined
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
        drawingBoard.update?.({
          ...boardState,
          tool: 'text',
          changingCmdId: textCommandUid,
          penColor: textCommand.color
        })

        // editor should be present in the DOM
        expect(isLiveTextEditorPresent(drawingPlugInPoint)).toBe(true)
        expect(getTextEditorColor(drawingPlugInPoint)).toBe(textCommand.color)

        const newText = 'New Text'
        setTextEditorText(drawingPlugInPoint, newText)

        const newColor = 'yellow' as ColorMetaNameOrHex
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
        const changedCommand = commandChangedSpy.mock.calls[0][0] as DrawTextCmd | undefined
        expect(changedCommand).toBeDefined()
        expect(changedCommand?.type).toBe('text')
        expect(changedCommand?.text).toBe(newText)
        expect(changedCommand?.color).toBe(newColor)
      })

      it('text editor closing with tool change', () => {
        const { drawingBoard, initialState } = createDrawingBoard(undefined, {})

        const textCmdId = makeCommandUid()
        drawingBoard.update?.({ ...initialState, tool: 'text' })
        drawingBoard.update?.({ ...initialState, tool: 'text', changingCmdId: textCmdId })

        jest.runOnlyPendingTimers()
        expect(isLiveTextEditorPresent(drawingPlugInPoint)).toBe(true)

        drawingBoard.update?.({ ...initialState, tool: 'pen', changingCmdId: textCmdId })

        jest.runOnlyPendingTimers()
        expect(isLiveTextEditorPresent(drawingPlugInPoint)).toBe(false)

        drawingBoard.update?.({ ...initialState, tool: 'erase', changingCmdId: undefined })

        jest.runOnlyPendingTimers()
        expect(isLiveTextEditorPresent(drawingPlugInPoint)).toBe(false)
      })
    })

    describe('canvas rescaling via ResizeObserver', () => {
      const resizeObserverSpyType = jest.fn()
      let resizeObserverSpy: any

      const DefaultPointerEventOffsetX = 13
      const DefaultPointerEventOffsetY = 17

      function flushRequestAnimationFrameCallbacks (): void {
        jest.runOnlyPendingTimers()
      }

      const makePointerEvent = (type: string, offsetX: number, offsetY: number): PointerEvent => {
        const event = new PointerEvent(type, { pointerId: 1, button: 0, bubbles: true, cancelable: true })
        Object.defineProperty(event, 'offsetX', { value: offsetX, writable: false })
        Object.defineProperty(event, 'offsetY', { value: offsetY, writable: false })
        return event
      }

      function expectSingleLineCommand (
        commandAddedSpy: jest.Mock,
        expectedPoints: Array<{ x: number, y: number }>
      ): void {
        expect(commandAddedSpy).toHaveBeenCalledTimes(1)
        const actualAddedCommand = commandAddedSpy.mock.calls[0][0]
        expect(actualAddedCommand).toBeDefined()
        expect(actualAddedCommand.type).toBe('line')
        expect(actualAddedCommand.points).toBeDefined()
        expect(actualAddedCommand.points.length).toBe(expectedPoints.length)
        expectedPoints.forEach((expectedPoint, index) => {
          expect(actualAddedCommand.points[index]).toStrictEqual(expectedPoint)
        })
      }

      beforeEach(() => {
        resizeObserverSpy = {
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn()
        }
        resizeObserverSpyType.mockImplementation(() => resizeObserverSpy)
        ;(globalThis as any).ResizeObserver = resizeObserverSpyType

        if (typeof PointerEvent === 'undefined') {
          ;(globalThis as any).PointerEvent = class MockPointerEvent extends Event {
            pointerId: number
            button: number
            offsetX: number
            offsetY: number

            constructor (type: string, options: any = {}) {
              super(type, options)
              this.pointerId = options.pointerId ?? 1
              this.button = options.button ?? 0
              this.offsetX = DefaultPointerEventOffsetX
              this.offsetY = DefaultPointerEventOffsetY
            }
          }
        }
      })

      it('basic pointer move', () => {
        const pointerMovedSpy = jest.fn()

        drawing(drawingPlugInPoint, {
          colorsList: [['alpha', new ThemeAwareColor('red', 'yellow')]],
          readonly: false,
          getCurrentTheme: () => 'theme-light',
          subscribeOnThemeChange: () => {},
          imageWidth: 400,
          imageHeight: 300,
          commands: [],
          tool: 'pen',
          pointerMoved: pointerMovedSpy
        })

        const canvas = drawingPlugInPoint.querySelector('canvas') as HTMLCanvasElement
        canvas.setPointerCapture = jest.fn()
        canvas.releasePointerCapture = jest.fn()
        expect(canvas.onpointermove).toBeDefined()
        expect(typeof canvas.onpointermove).toBe('function')

        const expectedPointerX = 50
        const expectedPointerY = 40
        const dummyPointerMoveEvent = makePointerEvent('pointermove', expectedPointerX, expectedPointerY)

        canvas.onpointermove?.(dummyPointerMoveEvent)

        expect(pointerMovedSpy).toHaveBeenCalledTimes(1)
        const actualPosition = pointerMovedSpy.mock.calls[0][0]
        expect(actualPosition).toStrictEqual({ x: expectedPointerX, y: expectedPointerY })
      })

      it('canvas resize followed by pen drawing', () => {
        const commandAddedSpy = jest.fn()
        const pointerMovedSpy = jest.fn()

        const backgroundImageWidth = 400
        const backgroundImageHeight = 300
        drawing(drawingPlugInPoint, {
          colorsList: [['alpha', new ThemeAwareColor('red', 'yellow')]],
          readonly: false,
          getCurrentTheme: () => 'theme-light',
          subscribeOnThemeChange: () => {},
          autoSize: false,
          imageWidth: backgroundImageWidth,
          imageHeight: backgroundImageHeight,
          commands: [],
          tool: 'pen',
          penColor: 'red' as ColorMetaNameOrHex,
          cmdAdded: commandAddedSpy,
          pointerMoved: pointerMovedSpy
        })

        // ResizeObserver was created and canvas is being observed
        expect(resizeObserverSpyType).toHaveBeenCalledTimes(1)
        const actualResizeObserverCallback = resizeObserverSpyType.mock.calls[0][0]
        const canvas = drawingPlugInPoint.querySelector('canvas') as HTMLCanvasElement
        canvas.setPointerCapture = jest.fn()
        canvas.releasePointerCapture = jest.fn()
        expect(resizeObserverSpy.observe).toHaveBeenCalledTimes(1)
        expect(resizeObserverSpy.observe.mock.calls[0][0]).toBe(canvas)

        // trigger the resize observer callback
        actualResizeObserverCallback([
          {
            target: canvas,
            contentRect: { width: 100, height: 150 }
          }
        ])

        // verify that CSS transform has been applied (should scale to fit aspect ratio)
        expect(canvas.style.transform).toContain('scale(1, 0.5)')

        jest.clearAllMocks()

        const drawStartPoint = { x: 50, y: 40 }
        const drawContinuePoint = { x: drawStartPoint.x + 25, y: drawStartPoint.y + 25 }
        const drawEndPoint = { x: drawContinuePoint.x + 25, y: drawContinuePoint.y + 25 }

        // simulate pointerdown (drawStart) by calling the handler directly
        canvas.onpointerdown?.(makePointerEvent('pointerdown', drawStartPoint.x, drawStartPoint.y))

        // simulate pointermove (drawContinue) - this should trigger pointerMoved callback
        canvas.onpointermove?.(makePointerEvent('pointermove', drawContinuePoint.x, drawContinuePoint.y))

        flushRequestAnimationFrameCallbacks()

        expect(pointerMovedSpy).toHaveBeenCalled()
        const actualFirstPointerPosition = pointerMovedSpy.mock.calls[0][0]
        expect(actualFirstPointerPosition).toStrictEqual({ x: 300, y: 130 })

        // simulate another pointermove to create a line with sufficient distance for drawing
        canvas.onpointermove?.(makePointerEvent('pointermove', drawEndPoint.x, drawEndPoint.y))

        flushRequestAnimationFrameCallbacks()

        // simulate pointerup (drawEnd)
        canvas.onpointerup?.(makePointerEvent('pointerup', drawEndPoint.x, drawEndPoint.y))

        flushRequestAnimationFrameCallbacks()

        expectSingleLineCommand(commandAddedSpy, [
          { x: 200, y: 80 },
          { x: 300, y: 130 },
          { x: 400, y: 180 }
        ])

        // test that subsequent resize events properly update the transform

        jest.clearAllMocks()

        // trigger another resize
        actualResizeObserverCallback([{ target: canvas, contentRect: { width: 300, height: 600 } }])

        expect(canvas.style.transform).toContain('scale(1, 0.375)')

        // another drawing operation
        canvas.onpointerdown?.(makePointerEvent('pointerdown', 80, 80))
        canvas.onpointermove?.(makePointerEvent('pointermove', 110, 110))
        flushRequestAnimationFrameCallbacks()
        canvas.onpointerup?.(makePointerEvent('pointerup', 110, 110))
        flushRequestAnimationFrameCallbacks()

        expect(pointerMovedSpy).toHaveBeenCalledTimes(1)

        expectSingleLineCommand(commandAddedSpy, [
          { x: 107, y: 40 },
          { x: 147, y: 55 }
        ])
      })
    })
  })
})
