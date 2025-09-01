//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { type ThemeVariantType } from '@hcengineering/theme'
import {
  type CanvasPoint,
  easeInOutCubic,
  middlePoint,
  offsetInParent,
  offsetPoint,
  rescaleToFitAspectRatio,
  scalePoint,
  type Point,
  makeCanvasPoint,
  type NodePoint,
  type MouseScaledPoint,
  makeMouseScaledPoint,
  makeNodePoint,
  offsetCanvasPoint,
  type ColorMetaNameOrHex
} from './drawingUtils'
import { type DrawingCmd, type CommandUid, type DrawTextCmd, type DrawLineCmd, makeCommandUid } from './drawingCommand'
import { type ColorsList, DrawingBoardColoringSetup, metaColorNameToHex } from './drawingColors'

export interface DrawingData {
  content?: string
}

export interface DrawingProps {
  readonly: boolean
  colorsList: ColorsList
  getCurrentTheme: () => ThemeVariantType
  subscribeOnThemeChange: (callback: () => void) => void
  autoSize?: boolean
  imageWidth?: number
  imageHeight?: number
  commands?: DrawingCmd[]
  offset?: Point
  tool?: DrawingTool
  penColor?: ColorMetaNameOrHex
  penWidth?: number
  eraserWidth?: number
  fontSize?: number
  defaultCursor?: string
  changingCmdId?: CommandUid
  personCursorPos?: Point
  personCursorVisible?: boolean
  cmdAdded?: (cmd: DrawingCmd) => void
  cmdChanging?: (id: CommandUid) => void
  cmdUnchanged?: (id: CommandUid) => void
  cmdChanged?: (cmd: DrawingCmd) => void
  cmdDeleted?: (id: CommandUid) => void
  editorCreated?: (editor: HTMLDivElement) => void
  pointerMoved?: (canvasPos: Point) => void
  personCursorMoved?: (nodePos: Point) => void
  panning?: (offset: Point) => void
  panned?: (offset: Point) => void
}

export type DrawingTool = 'pen' | 'erase' | 'pan' | 'text'

const maxTextLength = 500

const crossSvg = `<svg height="8" width="8" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="m1.29 2.71 5.3 5.29-5.3 5.29c-.92.92.49 2.34 1.41 1.41l5.3-5.29 5.29 5.3c.92.92 2.34-.49 1.41-1.41l-5.29-5.3 5.3-5.29c.92-.93-.49-2.34-1.42-1.42l-5.29 5.3-5.29-5.3c-.93-.92-2.34.49-1.42 1.42z"/>
</svg>`

type PointStatus = 'last-point' | 'intermediate-point'

class DrawState {
  on = false
  tool: DrawingTool = 'pen'
  penColor: ColorMetaNameOrHex = 'alpha'
  penWidth = 4
  eraserWidth = 30
  minLineLength = 6
  fontSize = 20
  fontFace = '"IBM Plex Sans"'
  center: Point = { x: 0, y: 0 }
  offset: Point = { x: 0, y: 0 }
  points: CanvasPoint[] = []
  scale: Point = { x: 1, y: 1 }
  cssTransformScale: Point = { x: 1, y: 1 }

  constructor (
    readonly ctx: CanvasRenderingContext2D,
    readonly colors: DrawingBoardColoringSetup
  ) {}

  cursorWidth = (): number => {
    return Math.max(8, this.tool === 'erase' ? this.eraserWidth : this.penWidth)
  }

  lineScale = (): number => {
    return (this.scale.x + this.scale.y) / 2
  }

  addPoint = (target: MouseScaledPoint): void => {
    this.points.push(this.mouseToCanvasPoint(target))
  }

  mouseToCanvasPoint = (mouse: MouseScaledPoint): CanvasPoint => {
    return makeCanvasPoint(
      Math.round(mouse.x * this.scale.x - this.offset.x - this.center.x),
      Math.round(mouse.y * this.scale.y - this.offset.y - this.center.y)
    )
  }

  canvasToMousePoint = (canvas: CanvasPoint): MouseScaledPoint => {
    return makeMouseScaledPoint(
      Math.round(canvas.x / this.scale.x + this.offset.x + this.center.x),
      Math.round(canvas.y / this.scale.y + this.offset.y + this.center.y)
    )
  }

  isDrawingTool = (): boolean => {
    return this.tool === 'pen' || this.tool === 'erase'
  }

  translateCtx = (): void => {
    this.ctx.translate(this.offset.x + this.center.x, this.offset.y + this.center.y)
  }

  drawLine = (point: MouseScaledPoint, status: PointStatus, currentTheme: ThemeVariantType): void => {
    window.requestAnimationFrame(() => {
      if (status === 'intermediate-point' || this.points.length <= 1) {
        this.addPoint(point)
      }
      const erasing = this.tool === 'erase'
      this.ctx.save()
      try {
        this.translateCtx()
        this.ctx.beginPath()
        this.ctx.lineCap = 'round'
        this.ctx.strokeStyle = metaColorNameToHex(this.penColor, currentTheme, this.colors)
        this.ctx.lineWidth = erasing ? this.eraserWidth : this.penWidth
        this.ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over'
        if (this.points.length === 1) {
          this.drawPoint(this.points[0], erasing)
        } else {
          this.drawSmoothSegment(this.points, this.points.length - 1, status)
          this.ctx.stroke()
        }
      } finally {
        this.ctx.restore()
      }
    })
  }

  drawCommand = (cmd: DrawingCmd, currentTheme: ThemeVariantType): void => {
    if (cmd.type === 'text') {
      this.drawTextCommand(cmd as DrawTextCmd, currentTheme)
    } else {
      this.drawLineCommand(cmd as DrawLineCmd, currentTheme)
    }
  }

  drawLineCommand = (cmd: DrawLineCmd, currentTheme: ThemeVariantType): void => {
    this.ctx.save()
    this.translateCtx()
    this.ctx.beginPath()
    this.ctx.lineCap = 'round'
    this.ctx.strokeStyle = metaColorNameToHex(cmd.penColor, currentTheme, this.colors)
    this.ctx.lineWidth = cmd.lineWidth
    this.ctx.globalCompositeOperation = cmd.erasing ? 'destination-out' : 'source-over'
    if (cmd.points.length === 1) {
      this.drawPoint(cmd.points[0], cmd.erasing)
    } else {
      for (let i = 1; i < cmd.points.length; i++) {
        const pointStatus: PointStatus = i === cmd.points.length - 1 ? 'last-point' : 'intermediate-point'
        this.drawSmoothSegment(cmd.points, i, pointStatus)
      }
      this.ctx.stroke()
    }
    this.ctx.restore()
  }

  drawTextCommand = (cmd: DrawTextCmd, currentTheme: ThemeVariantType): void => {
    const p = { ...cmd.pos }
    this.ctx.save()
    this.translateCtx()
    this.ctx.font = `${cmd.fontSize}px ${cmd.fontFace}`
    this.ctx.fillStyle = metaColorNameToHex(cmd.color, currentTheme, this.colors)
    this.ctx.textBaseline = 'top'
    const lines = cmd.text.split('\n').map((l) => l.trim())
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      this.ctx.fillText(line, p.x, p.y)
      p.y += cmd.fontSize
    }
    this.ctx.restore()
  }

  isPointInText = (p: CanvasPoint, cmd: DrawTextCmd): boolean => {
    this.ctx.font = `${cmd.fontSize}px ${cmd.fontFace}`
    const lines = cmd.text.split('\n').map((l) => l.trim())
    for (let i = 0; i < lines.length; i++) {
      if (p.y < cmd.pos.y + i * cmd.fontSize || p.y > cmd.pos.y + (i + 1) * cmd.fontSize) {
        continue
      }
      const line = lines[i]
      const metrics = this.ctx.measureText(line)
      if (p.x < cmd.pos.x || p.x > cmd.pos.x + metrics.width) {
        continue
      }
      return true
    }
    return false
  }

  drawPoint = (p: Point, erasing: boolean): void => {
    let r = this.ctx.lineWidth / 2
    if (!erasing) {
      // Single point looks too small compared to a line of the same width
      // So make it a bit biggers
      r *= 1 / r + 1
    }
    this.ctx.lineWidth = 0
    this.ctx.fillStyle = this.ctx.strokeStyle
    this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    this.ctx.fill()
  }

  drawSmoothSegment = (points: Point[], index: number, status: PointStatus): void => {
    const curPos = points[index]
    const prevPos = points[index - 1]
    const avg = middlePoint(prevPos, curPos)
    if (index === 1) {
      this.ctx.moveTo(prevPos.x, prevPos.y)
      if (status === 'last-point') {
        this.ctx.lineTo(curPos.x, curPos.y)
      } else {
        this.ctx.quadraticCurveTo(curPos.x, curPos.y, avg.x, avg.y)
      }
    } else {
      const prevAvg = middlePoint(points[index - 2], prevPos)
      this.ctx.moveTo(prevAvg.x, prevAvg.y)
      if (status === 'last-point') {
        this.ctx.quadraticCurveTo(prevPos.x, prevPos.y, curPos.x, curPos.y)
      } else {
        this.ctx.quadraticCurveTo(prevPos.x, prevPos.y, avg.x, avg.y)
      }
    }
  }
}

export function drawing (
  node: HTMLElement,
  props: DrawingProps
): { canvas?: HTMLCanvasElement, update?: (props: DrawingProps) => void } {
  if (props.autoSize !== true && (props.imageWidth === undefined || props.imageHeight === undefined)) {
    console.error('Failed to create drawing: image size is not specified')
    return {}
  }

  const canvas = document.createElement('canvas')
  canvas.style.position = 'absolute'
  canvas.style.left = '0'
  canvas.style.top = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.width = props.imageWidth ?? 0
  canvas.height = props.imageHeight ?? 0
  node.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    console.error('Failed to create drawing: unable to get 2d canvas context')
    node.removeChild(canvas)
    return {}
  }

  const toolCursor = document.createElement('div')
  toolCursor.style.visibility = 'hidden'
  toolCursor.style.position = 'absolute'
  toolCursor.style.borderRadius = '50%'
  toolCursor.style.border = 'none'
  toolCursor.style.cursor = 'none'
  toolCursor.style.pointerEvents = 'none'
  toolCursor.style.left = '50%'
  toolCursor.style.top = '50%'
  node.appendChild(toolCursor)

  let readonly = props.readonly ?? false
  let prevPos: MouseScaledPoint = makeMouseScaledPoint(0, 0)
  let personCursorPos: CanvasPoint = makeCanvasPoint(0, 0)
  let isPersonCursorAnimating = false

  const colorsSetup = new DrawingBoardColoringSetup(props.colorsList)
  const draw = new DrawState(ctx, colorsSetup)
  draw.tool = props.tool ?? draw.tool
  draw.penColor = props.penColor ?? draw.penColor
  draw.penWidth = props.penWidth ?? draw.penWidth
  draw.eraserWidth = props.eraserWidth ?? draw.eraserWidth
  draw.fontSize = props.fontSize ?? draw.fontSize
  draw.offset = props.offset ?? draw.offset
  let isOffsetAnimating = false

  updateToolCursor()
  updateCanvasTouchAction()

  interface LiveTextBox {
    pos: MouseScaledPoint
    box: HTMLDivElement
    editor: HTMLDivElement
    cmdId: CommandUid
  }
  let liveTextBox: LiveTextBox | undefined

  let currentCommands = props.commands

  function traverseCommands (target: DrawingCmd[] | undefined, delegate: (command: DrawingCmd) => boolean): void {
    if (undefined === target) {
      return
    }
    for (let i = 0; i < target.length; i++) {
      if (delegate(target[i])) {
        break
      }
    }
  }

  replayCommands(currentCommands)

  props.subscribeOnThemeChange(() => {
    updateToolCursor()
    replayCommands(currentCommands)
  })

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === canvas) {
        if (props.autoSize === true) {
          draw.scale = { x: 1, y: 1 }
          canvas.width = Math.floor(entry.contentRect.width)
          canvas.height = Math.floor(entry.contentRect.height)
          draw.center = {
            x: canvas.width / 2,
            y: canvas.height / 2
          }
          replayCommands(currentCommands)
        } else {
          const imageWidth = props.imageWidth ?? 1
          const imageHeight = props.imageHeight ?? 1
          const scale = rescaleToFitAspectRatio(
            imageWidth,
            imageHeight,
            entry.contentRect.width,
            entry.contentRect.height
          )
          canvas.style.transform = `scale(${scale.x}, ${scale.y})`
          draw.scale = {
            x: canvas.width / entry.contentRect.width / scale.x,
            y: canvas.height / entry.contentRect.height / scale.y
          }
          draw.cssTransformScale = scale
        }
      }
    }
  })
  resizeObserver.observe(canvas)

  let touchId: number | undefined

  function findTouch (touches: TouchList, id: number | undefined = touchId): Touch | undefined {
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]
      if (touch.identifier === id) {
        return touch
      }
    }
  }

  function touchToNodePoint (touch: Touch, node: HTMLElement): NodePoint {
    const rect = node.getBoundingClientRect()
    return makeNodePoint(Math.round(touch.clientX - rect.left), Math.round(touch.clientY - rect.top))
  }

  function pointerToNodePoint (e: PointerEvent): NodePoint {
    return makeNodePoint(Math.round(e.offsetX), Math.round(e.offsetY))
  }

  canvas.ontouchstart = (e) => {
    if (readonly) {
      return
    }
    const touch = e.changedTouches[0]
    touchId = touch.identifier
    drawStart(touchToNodePoint(touch, canvas))
  }

  canvas.ontouchmove = (e) => {
    if (readonly) {
      return
    }
    const touch = findTouch(e.changedTouches)
    if (touch !== undefined) {
      drawContinue(touchToNodePoint(touch, canvas))
    }
  }

  canvas.ontouchend = (e) => {
    if (readonly) {
      return
    }
    const touch = findTouch(e.changedTouches)
    if (touch !== undefined) {
      drawEnd(touchToNodePoint(touch, canvas))
    }
    touchId = undefined
  }

  canvas.ontouchcancel = canvas.ontouchend

  canvas.onpointerdown = (e) => {
    if (readonly) {
      return
    }
    if (e.button !== 0) {
      return
    }
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    drawStart(pointerToNodePoint(e))
  }

  canvas.onpointermove = (e) => {
    if (readonly) {
      return
    }
    e.preventDefault()
    drawContinue(pointerToNodePoint(e))
  }

  canvas.onpointerup = (e) => {
    if (readonly) {
      return
    }
    e.preventDefault()
    canvas.releasePointerCapture(e.pointerId)
    drawEnd(pointerToNodePoint(e))
  }

  canvas.onpointercancel = canvas.onpointerup

  canvas.onpointerenter = () => {
    if (!readonly && draw.isDrawingTool()) {
      toolCursor.style.visibility = 'visible'
    }
  }

  canvas.onpointerleave = () => {
    if (!readonly && draw.isDrawingTool()) {
      toolCursor.style.visibility = 'hidden'
    }
  }

  function rescaleWithCss (target: NodePoint): MouseScaledPoint {
    const scaled = scalePoint(target, draw.cssTransformScale)
    return makeMouseScaledPoint(scaled.x, scaled.y)
  }

  function drawStart (p: NodePoint): void {
    const scaledPoint = rescaleWithCss(p)
    draw.on = true
    draw.points = []
    prevPos = scaledPoint
    if (draw.isDrawingTool()) {
      draw.addPoint(scaledPoint)
    }
  }

  function drawContinue (p: NodePoint): void {
    const scaledPoint = rescaleWithCss(p)

    if (draw.isDrawingTool()) {
      const cursorSize = draw.cursorWidth()

      const canvasOffsetInParent = offsetInParent(node, canvas)
      const parentRelativeLocation = offsetPoint(scaledPoint, canvasOffsetInParent)
      toolCursor.style.left = `${parentRelativeLocation.x - cursorSize / 2}px`
      toolCursor.style.top = `${parentRelativeLocation.y - cursorSize / 2}px`

      if (draw.on) {
        if (Math.hypot(prevPos.x - scaledPoint.x, prevPos.y - scaledPoint.y) >= draw.minLineLength) {
          draw.drawLine(scaledPoint, 'intermediate-point', props.getCurrentTheme())
          prevPos = scaledPoint
        }
      }
    }

    if (draw.on && draw.tool === 'pan') {
      requestAnimationFrame(() => {
        draw.offset.x += scaledPoint.x - prevPos.x
        draw.offset.y += scaledPoint.y - prevPos.y
        replayCommands(currentCommands)
        prevPos = scaledPoint
        if (props.panning !== undefined) {
          props.panning(draw.offset)
        }
      })
    }

    if (draw.on && draw.tool === 'text') {
      prevPos = scaledPoint
    }

    if (props.pointerMoved !== undefined) {
      props.pointerMoved(draw.mouseToCanvasPoint(scaledPoint))
    }
  }

  function drawEnd (p: NodePoint): void {
    const scaledPoint = rescaleWithCss(p)
    if (draw.on) {
      if (draw.isDrawingTool()) {
        draw.drawLine(scaledPoint, 'last-point', props.getCurrentTheme())
        storeLineCommand()
      } else if (draw.tool === 'pan') {
        props.panned?.(draw.offset)
      } else if (draw.tool === 'text') {
        if (liveTextBox !== undefined) {
          commitTextEdit({ deferCommandStore: false })
        } else {
          const cmd = findTextCommand(prevPos)
          props.cmdChanging?.(cmd?.id ?? ('' as CommandUid))
        }
      }
      draw.on = false
    }
  }

  function findTextCommand (mousePos: MouseScaledPoint): DrawTextCmd | undefined {
    if (currentCommands === undefined) {
      return undefined
    }
    const pos = draw.mouseToCanvasPoint(mousePos)
    for (let i = currentCommands.length - 1; i >= 0; i--) {
      const candidate = currentCommands[i]
      if (candidate.type === 'text') {
        const cmd = candidate as DrawTextCmd
        if (draw.isPointInText(pos, cmd)) {
          return cmd
        }
      }
    }
    return undefined
  }

  function makeLiveTextBox (targetCommandId: CommandUid): void {
    let pos = prevPos
    let foundTextCommand: DrawTextCmd | undefined
    traverseCommands(currentCommands, (candidate) => {
      if (candidate.id === targetCommandId && candidate.type === 'text') {
        foundTextCommand = candidate as DrawTextCmd
        pos = draw.canvasToMousePoint(foundTextCommand.pos)
        return true
      }
      return false
    })

    const padding = 6
    const handleSize = 14

    const box = document.createElement('div')
    const editor = document.createElement('div')
    box.appendChild(editor)

    const canvasOffsetInParent = offsetInParent(node, canvas)
    const parentRelativeLocation = offsetPoint(pos, canvasOffsetInParent)

    box.style.zIndex = '1'
    box.style.position = 'absolute'
    box.style.left = `calc(${parentRelativeLocation.x}px - ${padding}px)`
    box.style.top = `calc(${parentRelativeLocation.y}px - ${padding}px)`
    box.style.border = '1px solid var(--theme-editbox-focus-border)'
    box.style.borderRadius = 'var(--small-BorderRadius)'
    box.style.padding = `${padding}px`
    box.style.background = 'var(--theme-popup-header)'
    box.style.touchAction = 'none'
    box.addEventListener('mousedown', (e) => {
      e.stopPropagation()
    })
    box.addEventListener('click', (e) => {
      e.stopPropagation()
      editor.focus()
    })

    editor.style.cursor = 'text'
    editor.style.padding = '0'
    editor.contentEditable = 'true'
    editor.style.outline = 'none'
    editor.style.minWidth = '2rem'
    editor.style.whiteSpace = 'nowrap'
    if (foundTextCommand !== undefined) {
      editor.innerText = foundTextCommand.text
    }
    editor.addEventListener('input', (e) => {
      if (editor.innerText.length > maxTextLength) {
        e.preventDefault()
        editor.innerText = editor.innerText.substring(0, maxTextLength)
        moveCaretToEnd()
      }
    })
    editor.addEventListener('paste', (e) => {
      e.preventDefault()
      const selection = window.getSelection()
      const text = (e.clipboardData?.getData('text/plain') ?? '').trim()
      if (text.length === 0 || selection === null || selection.rangeCount === 0) {
        return
      }
      let selectedLen = 0
      const range = selection.getRangeAt(0)
      if (editor.contains(range.commonAncestorContainer)) {
        selectedLen = range.endOffset - range.startOffset
      }
      const availableLen = maxTextLength - (selectedLen > 0 ? selectedLen : editor.innerText.length)
      if (availableLen > 0) {
        const lines = text.slice(0, availableLen).split('\n')
        const pastedNode = document.createDocumentFragment()
        for (let i = 0; i < lines.length; i++) {
          pastedNode.appendChild(document.createTextNode(lines[i]))
          if (i < lines.length - 1) {
            pastedNode.appendChild(document.createElement('br'))
          }
        }
        range.deleteContents()
        range.insertNode(pastedNode)
        // move caret to the end of pasted node
        range.collapse(false)
        selection.addRange(range)
      }
    })
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (liveTextBox !== undefined) {
          const cmdId = liveTextBox.cmdId
          // reset changingCmdId in clients
          setTimeout(() => {
            props.cmdUnchanged?.(cmdId)
          }, 0)
        }
        closeLiveTextBox()
        replayCommands(currentCommands)
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        commitTextEdit({ deferCommandStore: false })
      }
    })

    const moveCaretToEnd = (): void => {
      const selection = window.getSelection()
      const range = document.createRange()
      range.setStartAfter(editor.lastChild ?? editor)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }

    const selectAll = (): void => {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(editor)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }

    const makeHandle = (): HTMLDivElement => {
      const handle = document.createElement('div')
      handle.style.position = 'absolute'
      handle.style.top = `-${handleSize / 2}px`
      handle.style.width = `${handleSize}px`
      handle.style.height = `${handleSize}px`
      handle.style.color = 'var(--global-on-accent-TextColor)'
      handle.style.background = 'var(--global-accent-IconColor)'
      handle.style.borderRadius = '50%'
      handle.style.display = 'flex'
      handle.style.alignItems = 'center'
      handle.style.justifyContent = 'center'
      return handle
    }

    const moveTextBox = (dx: number, dy: number): void => {
      const canvasOffset = offsetInParent(node, canvas)
      let actualNewX = box.offsetLeft + dx
      let actualNewY = box.offsetTop + dy
      // For screenshots the canvas always has the same size as the underlying image
      // and we should not be able to drag the text box outside of the screenshot
      if (props.autoSize !== true) {
        const canvasSize: Point = { x: canvas.getBoundingClientRect().width, y: canvas.getBoundingClientRect().height }
        actualNewX = Math.max(canvasOffset.x, actualNewX)
        actualNewY = Math.max(canvasOffset.y, actualNewY)

        if (actualNewX > canvasOffset.x + canvasSize.x) {
          actualNewX = canvasOffset.x + canvasSize.x
        }
        if (actualNewY > canvasOffset.y + canvasSize.y) {
          actualNewY = canvasOffset.y + canvasSize.y
        }
      }
      box.style.left = `${actualNewX}px`
      box.style.top = `${actualNewY}px`
      if (liveTextBox !== undefined) {
        liveTextBox.pos.x = actualNewX - canvasOffset.x + padding
        liveTextBox.pos.y = actualNewY - canvasOffset.y + padding
      }
    }

    const dragHandle = makeHandle()
    dragHandle.style.left = `-${handleSize / 2}px`
    dragHandle.style.cursor = 'grab'
    dragHandle.style.touchAction = 'none'
    dragHandle.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      dragHandle.style.cursor = 'grabbing'
      dragHandle.setPointerCapture(e.pointerId)
      let previousDragPosition = { x: e.clientX, y: e.clientY }
      const pointerMove = (e: PointerEvent): void => {
        e.preventDefault()
        const currentDragPosition = { x: e.clientX, y: e.clientY }
        moveTextBox(currentDragPosition.x - previousDragPosition.x, currentDragPosition.y - previousDragPosition.y)
        previousDragPosition = currentDragPosition
      }
      const pointerUp = (e: PointerEvent): void => {
        setTimeout(() => {
          editor.focus()
        }, 100)
        e.preventDefault()
        dragHandle.style.cursor = 'grab'
        dragHandle.releasePointerCapture(e.pointerId)
        dragHandle.removeEventListener('pointermove', pointerMove)
        dragHandle.removeEventListener('pointerup', pointerUp)
        dragHandle.removeEventListener('pointercancel', pointerUp)
      }
      dragHandle.addEventListener('pointermove', pointerMove)
      dragHandle.addEventListener('pointerup', pointerUp)
      dragHandle.addEventListener('pointercancel', pointerUp)
    })
    dragHandle.addEventListener('touchstart', (e) => {
      dragHandle.style.cursor = 'grabbing'
      const touch = e.changedTouches[0]
      const touchId = touch.identifier
      let prevPos: MouseScaledPoint = rescaleWithCss(touchToNodePoint(touch, dragHandle))
      const touchMove = (e: TouchEvent): void => {
        const touch = findTouch(e.changedTouches, touchId)
        if (touch !== undefined) {
          const scaledPoint: MouseScaledPoint = rescaleWithCss(touchToNodePoint(touch, dragHandle))
          moveTextBox(scaledPoint.x - prevPos.x, scaledPoint.y - prevPos.y)
          prevPos = scaledPoint
        }
      }
      const touchEnd = (e: TouchEvent): void => {
        setTimeout(() => {
          editor.focus()
        }, 100)
        dragHandle.style.cursor = 'grab'
        dragHandle.removeEventListener('touchmove', touchMove)
        dragHandle.removeEventListener('touchend', touchEnd)
        dragHandle.removeEventListener('touchcancel', touchEnd)
      }
      dragHandle.addEventListener('touchmove', touchMove)
      dragHandle.addEventListener('touchend', touchEnd)
      dragHandle.addEventListener('touchcancel', touchEnd)
    })
    box.appendChild(dragHandle)

    const deleteButton = makeHandle()
    deleteButton.style.right = `-${handleSize / 2}px`
    deleteButton.style.cursor = 'pointer'
    deleteButton.innerHTML = crossSvg
    deleteButton.addEventListener('click', () => {
      node.removeChild(box)
      if (liveTextBox?.cmdId !== undefined) {
        props.cmdDeleted?.(liveTextBox.cmdId)
      }
      liveTextBox = undefined
    })
    box.appendChild(deleteButton)

    node.appendChild(box)
    liveTextBox = { box, editor, pos, cmdId: targetCommandId }
    updateLiveTextBox()
    setTimeout(() => {
      editor.focus()
    }, 100)
    selectAll()
    props.editorCreated?.(editor)
  }

  function updateLiveTextBox (): void {
    if (liveTextBox !== undefined) {
      liveTextBox.editor.style.color = metaColorNameToHex(draw.penColor, props.getCurrentTheme(), colorsSetup)
      liveTextBox.editor.style.lineHeight = `${draw.fontSize / draw.lineScale()}px`
      liveTextBox.editor.style.fontSize = `${draw.fontSize / draw.lineScale()}px`
      liveTextBox.editor.style.fontFamily = draw.fontFace
    }
  }

  function closeLiveTextBox (): void {
    if (liveTextBox !== undefined) {
      node.removeChild(liveTextBox.box)
      liveTextBox = undefined
    }
  }

  function storeTextCommand (parameters: { defer: boolean }): void {
    if (liveTextBox !== undefined) {
      const text = (liveTextBox.editor.innerText ?? '').trim()
      if (text !== '') {
        const cmdId = liveTextBox.cmdId
        const cmd: DrawTextCmd = {
          id: cmdId === '' ? makeCommandUid() : cmdId,
          type: 'text',
          text,
          pos: draw.mouseToCanvasPoint(liveTextBox.pos),
          fontSize: draw.fontSize,
          fontFace: draw.fontFace,
          color: draw.penColor
        }
        const notify = (): void => {
          if (cmdId !== '') {
            props.cmdChanged?.(cmd)
          } else {
            props.cmdAdded?.(cmd)
          }
        }
        if (parameters.defer) {
          setTimeout(notify, 0)
        } else {
          notify()
        }
      } else {
        props.cmdUnchanged?.(liveTextBox.cmdId)
      }
    }
  }

  function commitTextEdit (parameters: { deferCommandStore: boolean }): void {
    storeTextCommand({ defer: parameters.deferCommandStore })
    closeLiveTextBox()
  }

  function storeLineCommand (): void {
    if (draw.points.length > 0) {
      const erasing = draw.tool === 'erase'
      const cmd: DrawLineCmd = {
        id: makeCommandUid(),
        type: 'line',
        lineWidth: erasing ? draw.eraserWidth : draw.penWidth,
        erasing,
        penColor: draw.penColor,
        points: draw.points
      }
      props.cmdAdded?.(cmd)
    }
  }

  function updateToolCursor (): void {
    if (readonly) {
      toolCursor.style.visibility = 'hidden'
      canvas.style.cursor = props.defaultCursor ?? 'default'
    } else if (draw.isDrawingTool()) {
      canvas.style.cursor = 'none'
      toolCursor.style.visibility = 'visible'
      const erasing = draw.tool === 'erase'
      const w = draw.cursorWidth()
      toolCursor.style.background = erasing
        ? 'none'
        : metaColorNameToHex(draw.penColor, props.getCurrentTheme(), colorsSetup)
      toolCursor.style.boxShadow = erasing
        ? '0px 0px 1px 1px white inset, 0px 0px 2px 1px black'
        : '0px 0px 3px 0px var(--theme-button-contrast-enabled)'
      toolCursor.style.width = `${w}px`
      toolCursor.style.height = `${w}px`
    } else if (draw.tool === 'pan') {
      canvas.style.cursor = 'move'
      toolCursor.style.visibility = 'hidden'
    } else if (draw.tool === 'text') {
      canvas.style.cursor = 'text'
      toolCursor.style.visibility = 'hidden'
    } else {
      canvas.style.cursor = 'default'
      toolCursor.style.visibility = 'hidden'
    }
  }

  let personCursorPosNext: Point | undefined

  function updatePersonCursor (newPos?: Point): void {
    if (props.personCursorMoved === undefined) {
      return
    }

    // Repaint person cursor in the same canvas position but with different offset
    // The happen when we receive a new offset because of panning
    if (newPos === undefined) {
      const p = draw.canvasToMousePoint(personCursorPos)
      const x = Math.max(0, Math.min(p.x, canvas.width))
      const y = Math.max(0, Math.min(p.y, canvas.height))
      props.personCursorMoved({ x, y })
      return
    }

    if (isPersonCursorAnimating) {
      personCursorPosNext = newPos
      return
    }

    // This happens when we receive a new cursor position via subscription
    // Subscription events happen happen rarely, and if we'd just update the cursor position
    // it'd moved with big steps which looks ugly. So we smooth the movement
    // (Ideally, it'd be cool to interpolate curved movement the same as we interpolate line drawing)
    // Animation duration should be the same as myDataThrottleInterval in the Presence client
    const targetFps = 60
    const frameInterval = 1000 / targetFps
    const animDuration = 100
    const oldPos = personCursorPos
    const distanceX = newPos.x - oldPos.x
    const distanceY = newPos.y - oldPos.y
    let lastTime = 0
    let startTime = 0
    const animate = (currentTime: number): void => {
      if (lastTime === 0) {
        lastTime = currentTime
        startTime = currentTime
        requestAnimationFrame(animate)
        return
      }
      const deltaTime = currentTime - lastTime
      if (deltaTime > frameInterval) {
        lastTime = currentTime - (deltaTime % frameInterval)
        const frac = Math.min((lastTime - startTime) / animDuration, 1)
        personCursorPos = offsetCanvasPoint(oldPos, distanceX, distanceY, frac)
        if (props.personCursorMoved !== undefined) {
          const p = draw.canvasToMousePoint(personCursorPos)
          const x = Math.max(0, Math.min(p.x, canvas.width))
          const y = Math.max(0, Math.min(p.y, canvas.height))
          props.personCursorMoved({ x, y })
        }
        if (frac >= 1) {
          isPersonCursorAnimating = false

          if (personCursorPosNext !== undefined) {
            setTimeout(() => {
              const nextPos = personCursorPosNext
              personCursorPosNext = undefined
              updatePersonCursor(nextPos)
            }, 0)
          }
          return
        }
      }
      requestAnimationFrame(animate)
    }
    isPersonCursorAnimating = true
    requestAnimationFrame(animate)
  }

  function updateCanvasTouchAction (): void {
    canvas.style.touchAction = readonly ? 'unset' : 'none'
  }

  function replayCommands (drawing: DrawingCmd[] | undefined): void {
    draw.ctx.reset()

    /*
    On Safari (checked on 22.08.2025) reset() does not immediatly resets the canvas.
    The result looks like the "reset" command being cached and executed upon some
    action like mouse entering the canvas. Anyway with this line undo/redo (instantly
    adding commands) works good.
    */
    draw.ctx.clearRect(0, 0, canvas.width, canvas.height)

    const currentTheme: ThemeVariantType = props.getCurrentTheme()

    traverseCommands(drawing, (command) => {
      if (command.id === undefined || liveTextBox?.cmdId !== command.id) {
        draw.drawCommand(command, currentTheme)
      }
      return false
    })
  }

  return {
    canvas,

    update (props: DrawingProps) {
      let offsetDelta: Point | undefined
      let replay = false
      let syncToolCursor = false
      let toolChanged = false
      let syncPersonCursor: Point | undefined
      let syncLiveTextBox = false
      if (props.offset !== undefined && !isOffsetAnimating) {
        const deltaX = props.offset.x - draw.offset.x
        const deltaY = props.offset.y - draw.offset.y
        if (deltaX !== 0 || deltaY !== 0) {
          if (Math.hypot(deltaX, deltaY) > 20) {
            offsetDelta = { x: deltaX, y: deltaY }
          } else {
            draw.offset = props.offset
          }
          replay = true
        }
      }
      if (props.commands !== undefined) {
        if (currentCommands !== props.commands) {
          currentCommands = props.commands
          replay = true
        }
      }
      if (props.tool !== undefined) {
        if (draw.tool !== props.tool) {
          draw.tool = props.tool
          syncToolCursor = true
          toolChanged = true
        }
      }
      if (props.penColor !== undefined) {
        if (draw.penColor !== props.penColor) {
          draw.penColor = props.penColor
          syncLiveTextBox = true
          syncToolCursor = true
        }
      }
      if (props.penWidth !== undefined) {
        if (draw.penWidth !== props.penWidth) {
          draw.penWidth = props.penWidth
          syncToolCursor = true
        }
      }
      if (props.eraserWidth !== undefined) {
        if (draw.eraserWidth !== props.eraserWidth) {
          draw.eraserWidth = props.eraserWidth
          syncToolCursor = true
        }
      }
      if (props.fontSize !== undefined) {
        if (draw.fontSize !== props.fontSize) {
          draw.fontSize = props.fontSize
          syncLiveTextBox = true
        }
      }
      if (props.readonly !== undefined) {
        if (props.readonly !== readonly) {
          readonly = props.readonly
          updateCanvasTouchAction()
          syncToolCursor = true
        }
      }
      if (props.personCursorPos !== undefined) {
        if (props.personCursorPos.x !== personCursorPos.x || props.personCursorPos.y !== personCursorPos.y) {
          syncPersonCursor = props.personCursorPos
        }
      }

      if (props.changingCmdId === undefined || toolChanged) {
        if (liveTextBox !== undefined) {
          commitTextEdit({ deferCommandStore: true })
          replay = true
        }
      } else {
        if (liveTextBox === undefined) {
          if (props.tool === 'text') {
            makeLiveTextBox(props.changingCmdId)
            replay = true
          }
        } else if (liveTextBox.cmdId !== props.changingCmdId) {
          commitTextEdit({ deferCommandStore: true })
          replay = true
        }
      }

      if (syncToolCursor) {
        updateToolCursor()
      }
      if (syncPersonCursor !== undefined) {
        updatePersonCursor(syncPersonCursor)
      }
      if (syncLiveTextBox) {
        updateLiveTextBox()
      }
      if (replay) {
        if (offsetDelta !== undefined) {
          const distance = offsetDelta
          const targetFps = 60
          const frameInterval = 1000 / targetFps
          const animDuration = 500
          const oldOffset = draw.offset
          let lastTime = 0
          let startTime = 0
          const animate = (currentTime: number): void => {
            if (lastTime === 0) {
              lastTime = currentTime
              startTime = currentTime
              requestAnimationFrame(animate)
              return
            }
            const deltaTime = currentTime - lastTime
            if (deltaTime > frameInterval) {
              lastTime = currentTime - (deltaTime % frameInterval)
              const fracTime = Math.min((lastTime - startTime) / animDuration, 1)
              const fracDist = easeInOutCubic(fracTime)
              draw.offset = {
                x: Math.round(oldOffset.x + distance.x * fracDist),
                y: Math.round(oldOffset.y + distance.y * fracDist)
              }
              replayCommands(currentCommands)
              updatePersonCursor()
              if (fracTime >= 1) {
                isOffsetAnimating = false
                return
              }
            }
            requestAnimationFrame(animate)
          }
          isOffsetAnimating = true
          requestAnimationFrame(animate)
        } else {
          replayCommands(currentCommands)
          updatePersonCursor()
        }
      }
    }
  }
}
