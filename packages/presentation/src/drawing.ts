export interface DrawingProps {
  imageWidth?: number
  imageHeight?: number
  loadDrawing?: () => Promise<any>
  saveDrawing?: (data: any) => Promise<void>

  clearCanvas?: boolean
  drawingTool?: DrawingTool
  penColor?: string
  onDirty?: () => void
}

interface DrawingSource {
  content?: string
}

interface DrawCmd {
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
      x: mouseX * this.scale.x - this.offset.x,
      y: mouseY * this.scale.y - this.offset.y
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
    })
  }

  drawCommand = (cmd: DrawCmd): void => {
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

export function drawing (node: HTMLElement, props: DrawingProps): any {
  if (
    props.imageWidth === undefined ||
    props.imageHeight === undefined ||
    node.clientWidth === undefined ||
    node.clientHeight === undefined
  ) {
    console.error('Failed to create drawing: image size is not specified')
    return
  }

  const canvas = document.createElement('canvas')
  canvas.style.position = 'absolute'
  canvas.style.left = '0'
  canvas.style.top = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.width = props.imageWidth
  canvas.height = props.imageHeight
  node.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    console.error('Failed to create drawing: unable to get 2d canvas context')
    node.removeChild(canvas)
    return
  }

  const canvasCursor = document.createElement('div')
  canvasCursor.style.visibility = 'hidden'
  canvasCursor.style.position = 'absolute'
  canvasCursor.style.borderRadius = '50%'
  canvasCursor.style.cursor = 'none'
  canvasCursor.style.pointerEvents = 'none'
  node.appendChild(canvasCursor)

  let prevPos: Point = { x: 0, y: 0 }

  let source: DrawingSource = {}
  const draw = new DrawState(ctx)
  draw.tool = props.drawingTool ?? 'pan'
  draw.penColor = props.penColor ?? 'blue'
  updateCanvasCursor()

  let commands: DrawCmd[] = []
  if (props.loadDrawing === undefined) {
    console.log('Load drawing method is not provided')
  } else {
    props
      .loadDrawing()
      .then((result) => {
        source = result
        if (source.content !== undefined) {
          try {
            commands = JSON.parse(source.content)
            replayCommands()
          } catch (error) {
            console.error('Failed to parse drawing content', error)
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load drawing content', error)
      })
  }

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === canvas) {
        draw.scale = {
          x: canvas.width / entry.contentRect.width,
          y: canvas.height / entry.contentRect.height
        }
      }
    }
  })
  resizeObserver.observe(canvas)

  canvas.onpointerdown = (e) => {
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

    // TODO: if (draw.tool === 'pan')
  }

  canvas.onpointerup = (e) => {
    e.preventDefault()
    canvas.releasePointerCapture(e.pointerId)
    if (draw.on) {
      if (draw.isDrawingTool()) {
        draw.drawLive(e.offsetX, e.offsetY, true)
        storeCommand()
        if (props.onDirty !== undefined) {
          props.onDirty()
        }
      }
      draw.on = false
    }
  }

  canvas.onpointerenter = () => {
    if (draw.isDrawingTool()) {
      canvasCursor.style.visibility = 'visible'
    }
  }

  canvas.onpointerleave = () => {
    if (draw.isDrawingTool()) {
      canvasCursor.style.visibility = 'hidden'
    }
  }

  function storeCommand (): void {
    if (draw.points.length > 1) {
      const erasing = draw.tool === 'erase'
      const cmd: DrawCmd = {
        lineWidth: (erasing ? draw.eraserWidth : draw.penWidth) * draw.lineScale(),
        erasing,
        penColor: draw.penColor,
        points: draw.points
      }
      commands.push(cmd)
    }
  }

  function updateCanvasCursor (): void {
    if (draw.isDrawingTool()) {
      canvas.style.cursor = 'none'
      const erasing = draw.tool === 'erase'
      const w = draw.cursorWidth()
      canvasCursor.style.background = erasing ? 'none' : draw.penColor
      canvasCursor.style.border = erasing ? '1px solid #333' : 'none'
      canvasCursor.style.boxShadow = erasing ? '0px 0px 0px 1px #eee inset' : 'none'
      canvasCursor.style.width = `${w}px`
      canvasCursor.style.height = `${w}px`
    } else if (draw.tool === 'pan') {
      canvas.style.cursor = 'move'
    } else {
      canvas.style.cursor = 'default'
    }
  }

  function clearCanvas (): void {
    draw.ctx.reset()
    draw.offset = { x: 0, y: 0 }
  }

  function replayCommands (): void {
    draw.ctx.reset()
    for (const cmd of commands) {
      draw.drawCommand(cmd)
    }
  }

  return {
    update (props: DrawingProps) {
      if (draw.tool !== props.drawingTool) {
        draw.tool = props.drawingTool ?? 'pen'
        updateCanvasCursor()
      }
      if (draw.penColor !== props.penColor) {
        draw.penColor = props.penColor ?? 'blue'
        updateCanvasCursor()
      }
      if (props.clearCanvas === true) {
        clearCanvas()
      }
    },
    destroy () {
      if (props.saveDrawing === undefined) {
        console.log('Save drawing method is not provided')
      } else {
        source.content = JSON.stringify(commands)
        props.saveDrawing(source).catch((error) => {
          console.error('Failed to save drawing', error)
        })
      }
    }
  }
}
