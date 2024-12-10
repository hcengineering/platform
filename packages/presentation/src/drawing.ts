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

export interface DrawingData {
  content?: string
}

export interface DrawingProps {
  readonly: boolean
  autoSize?: boolean
  imageWidth?: number
  imageHeight?: number
  commands: DrawingCmd[]
  offset?: Point
  tool?: DrawingTool
  penColor?: string
  penWidth?: number
  eraserWidth?: number
  fontSize?: number
  defaultCursor?: string
  changingCmdIndex?: number
  cmdAdded?: (cmd: DrawingCmd) => void
  cmdChanging?: (index: number) => void
  cmdUnchanged?: (index: number) => void
  cmdChanged?: (index: number, cmd: DrawingCmd) => void
  cmdDeleted?: (index: number) => void
  panned?: (offset: Point) => void
}

export interface DrawingCmd {
  type: 'line' | 'text'
}

export interface DrawTextCmd extends DrawingCmd {
  text: string
  pos: Point
  fontSize: number
  fontFace: string
  color: string
}

export interface DrawLineCmd extends DrawingCmd {
  lineWidth: number
  erasing: boolean
  penColor: string
  points: Point[]
}

export type DrawingTool = 'pen' | 'erase' | 'pan' | 'text'

interface Point {
  x: number
  y: number
}

function avgPoint (p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

const maxTextLength = 500

const crossSvg = `<svg height="8" width="8" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="m1.29 2.71 5.3 5.29-5.3 5.29c-.92.92.49 2.34 1.41 1.41l5.3-5.29 5.29 5.3c.92.92 2.34-.49 1.41-1.41l-5.29-5.3 5.3-5.29c.92-.93-.49-2.34-1.42-1.42l-5.29 5.3-5.29-5.3c-.93-.92-2.34.49-1.42 1.42z"/>
</svg>`

class DrawState {
  on = false
  tool: DrawingTool = 'pen'
  penColor = 'blue'
  penWidth = 4
  eraserWidth = 30
  minLineLength = 6
  fontSize = 20
  fontFace = '"IBM Plex Sans"'
  center: Point = { x: 0, y: 0 }
  offset: Point = { x: 0, y: 0 }
  points: Point[] = []
  scale: Point = { x: 1, y: 1 }
  ctx: CanvasRenderingContext2D

  constructor (ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  cursorWidth = (): number => {
    return Math.max(8, this.tool === 'erase' ? this.eraserWidth : this.penWidth)
  }

  lineScale = (): number => {
    return (this.scale.x + this.scale.y) / 2
  }

  addPoint = (mouseX: number, mouseY: number): void => {
    this.points.push(this.mouseToCanvasPoint({ x: mouseX, y: mouseY }))
  }

  mouseToCanvasPoint = (mouse: Point): Point => {
    return {
      x: mouse.x * this.scale.x - this.offset.x - this.center.x,
      y: mouse.y * this.scale.y - this.offset.y - this.center.y
    }
  }

  canvasToMousePoint = (canvas: Point): Point => {
    return {
      x: canvas.x / this.scale.x + this.offset.x + this.center.x,
      y: canvas.y / this.scale.y + this.offset.y + this.center.y
    }
  }

  isDrawingTool = (): boolean => {
    return this.tool === 'pen' || this.tool === 'erase'
  }

  translateCtx = (): void => {
    this.ctx.translate(this.offset.x + this.center.x, this.offset.y + this.center.y)
  }

  drawLive = (x: number, y: number, lastPoint = false): void => {
    window.requestAnimationFrame(() => {
      if (!lastPoint || this.points.length > 1) {
        this.addPoint(x, y)
      }
      const erasing = this.tool === 'erase'
      this.ctx.save()
      this.translateCtx()
      this.ctx.beginPath()
      this.ctx.lineCap = 'round'
      this.ctx.strokeStyle = this.penColor
      this.ctx.lineWidth = erasing ? this.eraserWidth : this.penWidth
      this.ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over'
      if (this.points.length === 1) {
        this.drawPoint(this.points[0], erasing)
      } else {
        this.drawSmoothSegment(this.points, this.points.length - 1, lastPoint)
        this.ctx.stroke()
      }
      this.ctx.restore()
    })
  }

  drawCommand = (cmd: DrawingCmd): void => {
    if (cmd.type === 'text') {
      this.drawTextCommand(cmd as DrawTextCmd)
    } else {
      this.drawLineCommand(cmd as DrawLineCmd)
    }
  }

  drawLineCommand = (cmd: DrawLineCmd): void => {
    this.ctx.save()
    this.translateCtx()
    this.ctx.beginPath()
    this.ctx.lineCap = 'round'
    this.ctx.strokeStyle = cmd.penColor
    this.ctx.lineWidth = cmd.lineWidth
    this.ctx.globalCompositeOperation = cmd.erasing ? 'destination-out' : 'source-over'
    if (cmd.points.length === 1) {
      this.drawPoint(cmd.points[0], cmd.erasing)
    } else {
      for (let i = 1; i < cmd.points.length; i++) {
        this.drawSmoothSegment(cmd.points, i, i === cmd.points.length - 1)
      }
      this.ctx.stroke()
    }
    this.ctx.restore()
  }

  drawTextCommand = (cmd: DrawTextCmd): void => {
    const p = { ...cmd.pos }
    this.ctx.save()
    this.translateCtx()
    this.ctx.font = `${cmd.fontSize}px ${cmd.fontFace}`
    this.ctx.fillStyle = cmd.color
    this.ctx.textBaseline = 'top'
    const lines = cmd.text.split('\n').map((l) => l.trim())
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      this.ctx.fillText(line, p.x, p.y)
      p.y += cmd.fontSize
    }
    this.ctx.restore()
  }

  isPointInText = (p: Point, cmd: DrawTextCmd): boolean => {
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

  drawSmoothSegment = (points: Point[], index: number, lastPoint: boolean): void => {
    const curPos = points[index]
    const prevPos = points[index - 1]
    const avg = avgPoint(prevPos, curPos)
    if (index === 1) {
      this.ctx.moveTo(prevPos.x, prevPos.y)
      if (lastPoint) {
        this.ctx.lineTo(curPos.x, curPos.y)
      } else {
        this.ctx.quadraticCurveTo(curPos.x, curPos.y, avg.x, avg.y)
      }
    } else {
      const prevAvg = avgPoint(points[index - 2], prevPos)
      this.ctx.moveTo(prevAvg.x, prevAvg.y)
      if (lastPoint) {
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

  const canvasCursor = document.createElement('div')
  canvasCursor.style.visibility = 'hidden'
  canvasCursor.style.position = 'absolute'
  canvasCursor.style.borderRadius = '50%'
  canvasCursor.style.border = 'none'
  canvasCursor.style.cursor = 'none'
  canvasCursor.style.pointerEvents = 'none'
  canvasCursor.style.left = '50%'
  canvasCursor.style.top = '50%'
  node.appendChild(canvasCursor)

  let readonly = props.readonly ?? false
  let prevPos: Point = { x: 0, y: 0 }

  const draw = new DrawState(ctx)
  draw.tool = props.tool ?? draw.tool
  draw.penColor = props.penColor ?? draw.penColor
  draw.penWidth = props.penWidth ?? draw.penWidth
  draw.eraserWidth = props.eraserWidth ?? draw.eraserWidth
  draw.fontSize = props.fontSize ?? draw.fontSize
  draw.offset = props.offset ?? draw.offset

  updateCanvasCursor()
  updateCanvasTouchAction()

  interface LiveTextBox {
    pos: Point
    box: HTMLDivElement
    editor: HTMLDivElement
    cmdIndex: number
  }
  let liveTextBox: LiveTextBox | undefined

  let commands = props.commands
  replayCommands()

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === canvas) {
        if (props.autoSize === true) {
          draw.scale = { x: 1, y: 1 }
          canvas.width = Math.floor(entry.contentRect.width)
          canvas.height = Math.floor(entry.contentRect.height)
          draw.center.x = canvas.width / 2
          draw.center.y = canvas.height / 2
          replayCommands()
        } else {
          draw.scale = {
            x: canvas.width / entry.contentRect.width,
            y: canvas.height / entry.contentRect.height
          }
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

  function touchToNodePoint (touch: Touch, node: HTMLElement): Point {
    const rect = node.getBoundingClientRect()
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }

  function pointerToNodePoint (e: PointerEvent): Point {
    return { x: e.offsetX, y: e.offsetY }
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
      canvasCursor.style.visibility = 'visible'
    }
  }

  canvas.onpointerleave = () => {
    if (!readonly && draw.isDrawingTool()) {
      canvasCursor.style.visibility = 'hidden'
    }
  }

  function drawStart (p: Point): void {
    draw.on = true
    draw.points = []
    prevPos = p
    if (draw.isDrawingTool()) {
      draw.addPoint(p.x, p.y)
    }
  }

  function drawContinue (p: Point): void {
    if (draw.isDrawingTool()) {
      const w = draw.cursorWidth()
      canvasCursor.style.left = `${p.x - w / 2}px`
      canvasCursor.style.top = `${p.y - w / 2}px`
      if (draw.on) {
        if (Math.hypot(prevPos.x - p.x, prevPos.y - p.y) < draw.minLineLength) {
          return
        }
        draw.drawLive(p.x, p.y)
        prevPos = p
      }
    }

    if (draw.on && draw.tool === 'pan') {
      requestAnimationFrame(() => {
        draw.offset.x += p.x - prevPos.x
        draw.offset.y += p.y - prevPos.y
        replayCommands()
        prevPos = p
      })
    }

    if (draw.on && draw.tool === 'text') {
      prevPos = p
    }
  }

  function drawEnd (p: Point): void {
    if (draw.on) {
      if (draw.isDrawingTool()) {
        draw.drawLive(p.x, p.y, true)
        storeLineCommand()
      } else if (draw.tool === 'pan') {
        props.panned?.(draw.offset)
      } else if (draw.tool === 'text') {
        if (liveTextBox !== undefined) {
          storeTextCommand()
          closeLiveTextBox()
        } else {
          const cmdIndex = findTextCommand(prevPos)
          props.cmdChanging?.(cmdIndex)
        }
      }
      draw.on = false
    }
  }

  function findTextCommand (mousePos: Point): number {
    const pos = draw.mouseToCanvasPoint(mousePos)
    for (let i = commands.length - 1; i >= 0; i--) {
      const anyCmd = commands[i]
      if (anyCmd.type === 'text') {
        const cmd = anyCmd as DrawTextCmd
        if (draw.isPointInText(pos, cmd)) {
          return i
        }
      }
    }
    return -1
  }

  function makeLiveTextBox (cmdIndex: number): void {
    let pos = prevPos
    let existingCmd: DrawTextCmd | undefined
    if (cmdIndex >= 0 && commands[cmdIndex]?.type === 'text') {
      existingCmd = commands[cmdIndex] as DrawTextCmd
      pos = draw.canvasToMousePoint(existingCmd.pos)
    }

    const padding = 6
    const handleSize = 14

    const box = document.createElement('div')
    box.style.zIndex = '1'
    box.style.position = 'absolute'
    box.style.left = `calc(${pos.x}px - ${padding}px)`
    box.style.top = `calc(${pos.y}px - ${padding}px)`
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

    const editor = document.createElement('div')
    editor.style.cursor = 'text'
    editor.style.padding = '0'
    editor.contentEditable = 'true'
    editor.style.outline = 'none'
    editor.style.minWidth = '2rem'
    editor.style.whiteSpace = 'nowrap'
    if (existingCmd !== undefined) {
      editor.innerText = existingCmd.text
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
          const cmdIndex = liveTextBox.cmdIndex
          if (cmdIndex >= 0) {
            // reset changingCmdIndex in clients
            setTimeout(() => {
              props.cmdUnchanged?.(cmdIndex)
            }, 0)
          }
        }
        closeLiveTextBox()
        replayCommands()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        storeTextCommand()
        closeLiveTextBox()
      }
    })
    box.appendChild(editor)

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
      let newX = box.offsetLeft + dx
      let newY = box.offsetTop + dy
      // For screenshots the canvas always has the same size as the underlying image
      // and we should not be able to drag the text box outside of the screenshot
      if (props.autoSize !== true) {
        newX = Math.max(0, newX)
        newY = Math.max(0, newY)
        if (newX + box.offsetWidth > node.clientWidth) {
          newX = node.clientWidth - box.offsetWidth
        }
        if (newY + box.offsetHeight > node.clientHeight) {
          newY = node.clientHeight - box.offsetHeight
        }
      }
      box.style.left = `${newX}px`
      box.style.top = `${newY}px`
      if (liveTextBox !== undefined) {
        liveTextBox.pos.x = newX + padding
        liveTextBox.pos.y = newY + padding
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
      let prevPos = { x: e.clientX, y: e.clientY }
      const pointerMove = (e: PointerEvent): void => {
        e.preventDefault()
        const p = { x: e.clientX, y: e.clientY }
        moveTextBox(p.x - prevPos.x, p.y - prevPos.y)
        prevPos = p
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
      let prevPos = touchToNodePoint(touch, dragHandle)
      const touchMove = (e: TouchEvent): void => {
        const touch = findTouch(e.changedTouches, touchId)
        if (touch !== undefined) {
          const p = touchToNodePoint(touch, dragHandle)
          moveTextBox(p.x - prevPos.x, p.y - prevPos.y)
          prevPos = p
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
      if (liveTextBox?.cmdIndex !== undefined) {
        props.cmdDeleted?.(liveTextBox.cmdIndex)
      }
      liveTextBox = undefined
    })
    box.appendChild(deleteButton)

    node.appendChild(box)
    liveTextBox = { box, editor, pos, cmdIndex }
    updateLiveTextBox()
    setTimeout(() => {
      editor.focus()
    }, 100)
    selectAll()
  }

  function updateLiveTextBox (): void {
    if (liveTextBox !== undefined) {
      liveTextBox.editor.style.color = draw.penColor
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

  function storeTextCommand (defer = false): void {
    if (liveTextBox !== undefined) {
      const text = (liveTextBox.editor.innerText ?? '').trim()
      if (text !== '') {
        const cmd: DrawTextCmd = {
          type: 'text',
          text,
          pos: draw.mouseToCanvasPoint(liveTextBox.pos),
          fontSize: draw.fontSize,
          fontFace: draw.fontFace,
          color: draw.penColor
        }
        const cmdIndex = liveTextBox.cmdIndex
        const notify = (): void => {
          if (cmdIndex >= 0) {
            props.cmdChanged?.(cmdIndex, cmd)
          } else {
            props.cmdAdded?.(cmd)
          }
        }
        if (defer) {
          setTimeout(notify, 0)
        } else {
          notify()
        }
      } else {
        props.cmdUnchanged?.(liveTextBox.cmdIndex)
      }
    }
  }

  function storeLineCommand (): void {
    if (draw.points.length > 0) {
      const erasing = draw.tool === 'erase'
      const cmd: DrawLineCmd = {
        type: 'line',
        lineWidth: erasing ? draw.eraserWidth : draw.penWidth,
        erasing,
        penColor: draw.penColor,
        points: draw.points
      }
      props.cmdAdded?.(cmd)
    }
  }

  function updateCanvasCursor (): void {
    if (readonly) {
      canvasCursor.style.visibility = 'hidden'
      canvas.style.cursor = props.defaultCursor ?? 'default'
    } else if (draw.isDrawingTool()) {
      canvas.style.cursor = 'none'
      canvasCursor.style.visibility = 'visible'
      const erasing = draw.tool === 'erase'
      const w = draw.cursorWidth()
      canvasCursor.style.background = erasing ? 'none' : draw.penColor
      canvasCursor.style.boxShadow = erasing
        ? '0px 0px 1px 1px white inset, 0px 0px 2px 1px black'
        : '0px 0px 3px 0px var(--theme-button-contrast-enabled)'
      canvasCursor.style.width = `${w}px`
      canvasCursor.style.height = `${w}px`
    } else if (draw.tool === 'pan') {
      canvas.style.cursor = 'move'
      canvasCursor.style.visibility = 'hidden'
    } else if (draw.tool === 'text') {
      canvas.style.cursor = 'text'
      canvasCursor.style.visibility = 'hidden'
    } else {
      canvas.style.cursor = 'default'
      canvasCursor.style.visibility = 'hidden'
    }
  }

  function updateCanvasTouchAction (): void {
    canvas.style.touchAction = readonly ? 'unset' : 'none'
  }

  function replayCommands (): void {
    draw.ctx.reset()
    for (let i = 0; i < commands.length; i++) {
      if (liveTextBox?.cmdIndex === i) {
        continue
      }
      draw.drawCommand(commands[i])
    }
  }

  return {
    canvas,

    update (props: DrawingProps) {
      let replay = false
      if (props.offset !== undefined && (props.offset.x !== draw.offset.x || props.offset.y !== draw.offset.y)) {
        draw.offset = props.offset
        replay = true
      }
      if (commands !== props.commands) {
        commands = props.commands
        replay = true
      }
      let updateCursor = false
      let updateTextBox = false
      if (draw.tool !== props.tool) {
        draw.tool = props.tool ?? 'pen'
        updateCursor = true
      }
      if (draw.penColor !== props.penColor) {
        draw.penColor = props.penColor ?? 'blue'
        updateTextBox = true
        updateCursor = true
      }
      if (draw.penWidth !== props.penWidth) {
        draw.penWidth = props.penWidth ?? draw.penWidth
        updateCursor = true
      }
      if (draw.eraserWidth !== props.eraserWidth) {
        draw.eraserWidth = props.eraserWidth ?? draw.eraserWidth
        updateCursor = true
      }
      if (draw.fontSize !== props.fontSize) {
        draw.fontSize = props.fontSize ?? draw.fontSize
        updateTextBox = true
      }
      if (props.readonly !== readonly) {
        readonly = props.readonly ?? false
        updateCanvasTouchAction()
        updateCursor = true
      }
      if (props.changingCmdIndex === undefined) {
        if (liveTextBox !== undefined) {
          storeTextCommand(true)
          closeLiveTextBox()
          replay = true
        }
      } else {
        if (liveTextBox === undefined) {
          makeLiveTextBox(props.changingCmdIndex)
          replay = true
        } else if (liveTextBox.cmdIndex !== props.changingCmdIndex) {
          storeTextCommand(true)
          closeLiveTextBox()
          replay = true
        }
      }
      if (updateCursor) {
        updateCanvasCursor()
      }
      if (updateTextBox) {
        updateLiveTextBox()
      }
      if (replay) {
        replayCommands()
      }
    }
  }
}
