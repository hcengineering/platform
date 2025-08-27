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

import { rescaleToFitAspectRatio, scalePoint, offsetPoint, offsetInParent, type Point } from '../drawingUtils'

describe('drawingUtils module tests', () => {
  describe('scalePoint', () => {
    it('execution', () => {
      const point = { x: 10, y: 30 }
      const scale = { x: 5, y: 7 }
      const scaled = scalePoint(point, scale)
      expect(scaled).toEqual({ x: 50, y: 210 })
    })
  })

  describe('rescaleToFitAspectRatio', () => {
    interface ReferenceAndActual {
      referenceWidth: number
      referenceHeight: number
      actualWidth: number
      actualHeight: number
    }

    interface TestCase {
      description: string
      data: ReferenceAndActual
    }

    const testCases: TestCase[] = [
      {
        description: 'horizontal reference, horizontal target, less width, greater height',
        data: { referenceWidth: 800, referenceHeight: 600, actualWidth: 700, actualHeight: 650 }
      },
      {
        description: 'horizontal reference, horizontal target, greater width, greater height',
        data: { referenceWidth: 800, referenceHeight: 600, actualWidth: 900, actualHeight: 650 }
      },
      {
        description: 'horizontal reference, horizontal target, less width, less height',
        data: { referenceWidth: 800, referenceHeight: 600, actualWidth: 700, actualHeight: 500 }
      },
      {
        description: 'horizontal reference, horizontal target, greater width, less height',
        data: { referenceWidth: 800, referenceHeight: 600, actualWidth: 900, actualHeight: 500 }
      },

      {
        description: 'horizontal reference, vertical target, less height, greater width',
        data: { referenceWidth: 800, referenceHeight: 600, actualWidth: 90, actualHeight: 7000 }
      },
      {
        description: 'horizontal reference, vertical target, greater width, greater height',
        data: { referenceWidth: 800, referenceHeight: 600, actualWidth: 900, actualHeight: 7000 }
      },
      {
        description: 'horizontal reference, vertical target, less width, less height',
        data: { referenceWidth: 800, referenceHeight: 600, actualWidth: 90, actualHeight: 170 }
      },

      {
        description: 'vertical reference, horizontal target, greater width, greater height',
        data: { referenceWidth: 600, referenceHeight: 800, actualWidth: 903, actualHeight: 803 }
      },
      {
        description: 'vertical reference, horizontal target, less width, less height',
        data: { referenceWidth: 600, referenceHeight: 800, actualWidth: 500, actualHeight: 100 }
      },
      {
        description: 'vertical reference, horizontal target, greater width, less height',
        data: { referenceWidth: 600, referenceHeight: 800, actualWidth: 900, actualHeight: 500 }
      },

      {
        description: 'vertical reference, vertical target, less width, greater height',
        data: { referenceWidth: 600, referenceHeight: 800, actualWidth: 500, actualHeight: 900 }
      },
      {
        description: 'vertical reference, vertical target, greater width, greater height',
        data: { referenceWidth: 600, referenceHeight: 800, actualWidth: 700, actualHeight: 900 }
      },
      {
        description: 'vertical reference, vertical target, less width, less height',
        data: { referenceWidth: 600, referenceHeight: 800, actualWidth: 500, actualHeight: 700 }
      },
      {
        description: 'vertical reference, vertical target, greater width, less height',
        data: { referenceWidth: 600, referenceHeight: 800, actualWidth: 650, actualHeight: 700 }
      }
    ]

    it.each(testCases)('$description', ({ data: { referenceWidth, referenceHeight, actualWidth, actualHeight } }) => {
      const scale = rescaleToFitAspectRatio(referenceWidth, referenceHeight, actualWidth, actualHeight)

      const scaledWidth = actualWidth * scale.x
      const scaledHeight = actualHeight * scale.y

      const resultAspectRatio = scaledWidth / scaledHeight
      const desiredAspectRatio = referenceWidth / referenceHeight

      expect(resultAspectRatio).toBeCloseTo(desiredAspectRatio, 6)
      expect(scale.x === 1 || scale.y === 1).toBe(true)
    })
  })

  describe('offsetPoint', () => {
    interface TestCase {
      description: string
      victim: Point
      offset: Point
      expected: Point
    }

    const testCases: TestCase[] = [
      {
        description: 'positive offset',
        victim: { x: 10, y: 20 },
        offset: { x: 5, y: 15 },
        expected: { x: 15, y: 35 }
      },
      {
        description: 'negative offset',
        victim: { x: 10, y: 20 },
        offset: { x: -3, y: -8 },
        expected: { x: 7, y: 12 }
      },
      {
        description: 'zero offset',
        victim: { x: 10, y: 20 },
        offset: { x: 0, y: 0 },
        expected: { x: 10, y: 20 }
      },
      {
        description: 'mixed positive and negative offset',
        victim: { x: 10, y: 20 },
        offset: { x: -5, y: 10 },
        expected: { x: 5, y: 30 }
      }
    ]

    it.each(testCases)('$description', ({ victim, offset, expected }) => {
      const result = offsetPoint(victim, offset)
      expect(result).toEqual(expected)
    })
  })

  describe('offsetInParent', () => {
    interface TestCase {
      description: string
      parentSize: { width: number, height: number }
      childSize: { width: number, height: number }
      expected: Point
    }

    const testCases: TestCase[] = [
      {
        description: 'child smaller than parent',
        parentSize: { width: 200, height: 100 },
        childSize: { width: 100, height: 50 },
        expected: { x: 50, y: 25 }
      },
      {
        description: 'child same size as parent',
        parentSize: { width: 100, height: 100 },
        childSize: { width: 100, height: 100 },
        expected: { x: 0, y: 0 }
      },
      {
        description: 'child larger than parent',
        parentSize: { width: 100, height: 50 },
        childSize: { width: 200, height: 100 },
        expected: { x: -50, y: -25 }
      },
      {
        description: 'asymmetric sizes',
        parentSize: { width: 300, height: 80 },
        childSize: { width: 100, height: 40 },
        expected: { x: 100, y: 20 }
      }
    ]

    it.each(testCases)('$description', ({ parentSize, childSize, expected }) => {
      // Create mock HTML elements
      const mockParent = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          width: parentSize.width,
          height: parentSize.height
        })
      } as unknown as HTMLElement

      const mockChild = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          width: childSize.width,
          height: childSize.height
        })
      } as unknown as HTMLElement

      const result = offsetInParent(mockParent, mockChild)
      expect(result).toEqual(expected)
    })
  })
})
