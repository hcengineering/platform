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
  commandCount?: number
  commands: DrawingCmd[]
  offset?: Point
  tool?: DrawingTool
  penColor?: string
  defaultCursor?: string
  cmdAdded?: (cmd: DrawingCmd) => void
  panned?: (offset: Point) => void
}

export interface DrawingCmd {
  lineWidth: number
  erasing: boolean
  penColor: string
  points: Point[]
}

export type DrawingTool = 'pen' | 'erase' | 'pan'

interface Point {
  x: number
  y: number
}

function avgPoint (p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

class DrawState {
  on = false
  tool: DrawingTool = 'pen'
  penColor = 'blue'
  penWidth = 4
  eraserWidth = 30
  minLineLength = 6
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
    this.points.push({
      x: mouseX * this.scale.x - this.offset.x - this.center.x,
      y: mouseY * this.scale.y - this.offset.y - this.center.y
    })
  }

  isDrawingTool = (): boolean => {
    return this.tool === 'pen' || this.tool === 'erase'
  }

  drawLive = (x: number, y: number, lastPoint = false): void => {
    window.requestAnimationFrame(() => {
      if (!lastPoint || this.points.length > 1) {
        this.addPoint(x, y)
      }
      const erasing = this.tool === 'erase'
      this.ctx.save()
      this.ctx.translate(this.offset.x + this.center.x, this.offset.y + this.center.y)
      this.ctx.beginPath()
      this.ctx.lineCap = 'round'
      this.ctx.strokeStyle = this.penColor
      this.ctx.lineWidth = (erasing ? this.eraserWidth : this.penWidth) * this.lineScale()
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
    this.ctx.save()
    this.ctx.translate(this.offset.x + this.center.x, this.offset.y + this.center.y)
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

  drawPoint = (p: Point, erasing: boolean): void => {
    let r = this.ctx.lineWidth / 2
    if (!erasing) {
      // Single point looks too small compared to a line of the same width
      // So make it a bit biggers
      r *= 1.5
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
  canvasCursor.style.cursor = 'none'
  canvasCursor.style.pointerEvents = 'none'
  node.appendChild(canvasCursor)

  let readonly = props.readonly ?? false
  let prevPos: Point = { x: 0, y: 0 }

  const draw = new DrawState(ctx)
  draw.tool = props.tool ?? 'pan'
  draw.penColor = props.penColor ?? 'blue'
  updateCanvasCursor()

  let commands = props.commands
  let commandCount = props.commandCount ?? 0
  replayCommands({
    offset: {
      x: props.offset?.x ?? 0,
      y: props.offset?.y ?? 0
    }
  })

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === canvas) {
        if (props.autoSize === true) {
          draw.scale = { x: 1, y: 1 }
          canvas.width = Math.floor(entry.contentRect.width)
          canvas.height = Math.floor(entry.contentRect.height)
          draw.center.x = canvas.width / 2
          draw.center.y = canvas.height / 2
          replayCommands({ offset: draw.offset })
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

  canvas.onpointerdown = (e) => {
    if (readonly) {
      return
    }
    if (e.button !== 0) {
      return
    }
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)

    const x = e.offsetX
    const y = e.offsetY

    draw.on = true
    draw.points = []
    prevPos = { x, y }
    if (draw.isDrawingTool()) {
      draw.addPoint(x, y)
    }
  }

  canvas.onpointermove = (e) => {
    if (readonly) {
      return
    }
    e.preventDefault()

    const x = e.offsetX
    const y = e.offsetY

    if (draw.isDrawingTool()) {
      const w = draw.cursorWidth()
      canvasCursor.style.left = `${x - w / 2}px`
      canvasCursor.style.top = `${y - w / 2}px`
      if (draw.on) {
        if (Math.hypot(prevPos.x - x, prevPos.y - y) < draw.minLineLength) {
          return
        }
        draw.drawLive(x, y)
        prevPos = { x, y }
      }
    }

    if (draw.on && draw.tool === 'pan') {
      requestAnimationFrame(() => {
        replayCommands({
          offset: {
            x: draw.offset.x + x - prevPos.x,
            y: draw.offset.y + y - prevPos.y
          }
        })
        prevPos = { x, y }
        props.panned?.(draw.offset)
      })
    }
  }

  canvas.onpointerup = (e) => {
    if (readonly) {
      return
    }
    e.preventDefault()
    canvas.releasePointerCapture(e.pointerId)
    if (draw.on) {
      if (draw.isDrawingTool()) {
        draw.drawLive(e.offsetX, e.offsetY, true)
        storeCommand()
      }
      draw.on = false
    }
  }

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

  function storeCommand (): void {
    if (draw.points.length > 1) {
      const erasing = draw.tool === 'erase'
      const cmd: DrawingCmd = {
        lineWidth: (erasing ? draw.eraserWidth : draw.penWidth) * draw.lineScale(),
        erasing,
        penColor: draw.penColor,
        points: draw.points
      }
      commands.push(cmd)
      props.cmdAdded?.(cmd)
    }
  }

  function updateCanvasCursor (): void {
    if (readonly) {
      canvasCursor.style.visibility = 'hidden'
      canvas.style.cursor = props.defaultCursor ?? 'default'
    } else if (draw.isDrawingTool()) {
      canvas.style.cursor = 'none'
      const erasing = draw.tool === 'erase'
      const w = draw.cursorWidth()
      canvasCursor.style.background = erasing ? 'none' : draw.penColor
      canvasCursor.style.border = erasing ? '1px solid #333' : 'none'
      canvasCursor.style.boxShadow = erasing
        ? '0px 0px 0px 1px #eee inset'
        : '0px 0px .15rem 0px var(--theme-button-contrast-enabled)'
      canvasCursor.style.width = `${w}px`
      canvasCursor.style.height = `${w}px`
    } else if (draw.tool === 'pan') {
      canvas.style.cursor = 'move'
      canvasCursor.style.visibility = 'hidden'
    } else {
      canvas.style.cursor = 'default'
      canvasCursor.style.visibility = 'hidden'
    }
  }

  function clearCanvas (): void {
    draw.ctx.reset()
    draw.offset = { x: 0, y: 0 }
  }

  function replayCommands ({ offset, startIndex }: { offset?: Point, startIndex?: number } = {}): void {
    if (startIndex === undefined || startIndex === 0) {
      clearCanvas()
    }
    if (offset !== undefined) {
      draw.offset = offset
    }
    for (let i = startIndex ?? 0; i < commands.length; i++) {
      draw.drawCommand(commands[i])
    }
    commandCount = commands.length
  }

  return {
    canvas,

    update (props: DrawingProps) {
      let replay = false
      let offset: Point | undefined
      let startIndex: number | undefined
      if (props.offset?.x !== draw.offset.x || props.offset?.y !== draw.offset.y) {
        offset = props.offset
        replay = true
      }
      if (commands !== props.commands) {
        commands = props.commands
        replay = true
      } else if (props.commandCount !== undefined && props.commandCount !== commandCount) {
        startIndex = commandCount
        replay = true
      }
      let updateCursor = false
      if (draw.tool !== props.tool) {
        draw.tool = props.tool ?? 'pen'
        updateCursor = true
      }
      if (draw.penColor !== props.penColor) {
        draw.penColor = props.penColor ?? 'blue'
        updateCursor = true
      }
      if (props.readonly !== readonly) {
        readonly = props.readonly ?? false
        updateCursor = true
      }
      if (updateCursor) {
        updateCanvasCursor()
      }
      if (replay) {
        replayCommands({ offset, startIndex })
      }
    }
  }
}
