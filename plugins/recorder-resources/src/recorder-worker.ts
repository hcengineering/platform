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

export interface WorkerMessage {
  type: 'start' | 'fps' | 'frame' | 'stop'
  fps?: number
}

let running = false
let fps = 30

// High-precision timing variables
let targetFrameTime = 1000 / fps
let lastTime = 0
let accumulator = 0

// Main timing loop
function start (): void {
  if (running) return

  running = true
  lastTime = performance.now()

  const tick = (): void => {
    if (!running) return

    const now = performance.now()
    const deltaTime = now - lastTime
    lastTime = now

    // Accumulator pattern for consistent timing
    accumulator += deltaTime

    while (accumulator >= targetFrameTime) {
      // Send frame event to main thread
      self.postMessage({ type: 'frame' })
      accumulator -= targetFrameTime
    }

    // Schedule next tick with compensation for drift
    const nextDelay = Math.max(1, targetFrameTime - accumulator)
    setTimeout(tick, nextDelay)
  }

  // Start the timing loop
  tick()
}

function stop (): void {
  running = false
  accumulator = 0
}

// Handle messages from main thread
self.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data

  switch (type) {
    case 'start':
      updateFps(e.data.fps)
      start()
      break

    case 'stop':
      stop()
      break

    case 'fps':
      updateFps(e.data.fps)
      break
  }
})

function updateFps (newFps: number | undefined): void {
  if (newFps !== undefined && newFps > 0) {
    fps = newFps
    targetFrameTime = 1000 / fps
  }
}

self.addEventListener('error', (e: ErrorEvent) => {
  console.error('Worker error:', e.message)
  self.postMessage({
    type: 'error',
    error: {
      message: e.error.message,
      stack: e.error.stack,
      filename: e.filename,
      lineno: e.lineno
    }
  })
})

self.addEventListener('unhandledrejection', (event) => {
  self.postMessage({
    type: 'unhandledRejection',
    reason: event.reason
  })
})
