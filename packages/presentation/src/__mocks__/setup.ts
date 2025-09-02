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

// TypeScript setup for Jest test environment

declare global {
  interface Window {
    getComputedStyle: (element: Element, pseudoElt?: string | null) => CSSStyleDeclaration
  }
}

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: (): Partial<CSSStyleDeclaration> => ({
    getPropertyValue: (): string => ''
  })
})

// Canvas API mock interface
interface MockCanvasRenderingContext2D {
  clearRect: jest.MockedFunction<() => void>
  beginPath: jest.MockedFunction<() => void>
  moveTo: jest.MockedFunction<() => void>
  lineTo: jest.MockedFunction<() => void>
  stroke: jest.MockedFunction<() => void>
  fill: jest.MockedFunction<() => void>
  strokeText: jest.MockedFunction<() => void>
  fillText: jest.MockedFunction<() => void>
  arc: jest.MockedFunction<() => void>
  save: jest.MockedFunction<() => void>
  restore: jest.MockedFunction<() => void>
  translate: jest.MockedFunction<() => void>
  scale: jest.MockedFunction<() => void>
  rotate: jest.MockedFunction<() => void>
  setTransform: jest.MockedFunction<() => void>
  drawImage: jest.MockedFunction<() => void>
  createImageData: jest.MockedFunction<() => void>
  getImageData: jest.MockedFunction<() => void>
  putImageData: jest.MockedFunction<() => void>
  measureText: jest.MockedFunction<() => { width: number }>
}

// Canvas API mock if needed
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: (): MockCanvasRenderingContext2D => ({
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    strokeText: jest.fn(),
    fillText: jest.fn(),
    arc: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    createImageData: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    measureText: jest.fn().mockReturnValue({ width: 0 })
  })
})

export {}
