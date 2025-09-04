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

import { ThemeAwareColor, type ColorsList, DrawingBoardColoringSetup, metaColorNameToHex } from '../drawingColors'
import {
  rescaleToFitAspectRatio,
  scalePoint,
  offsetPoint,
  offsetInParent,
  type Point,
  type ColorMetaName,
  type ColorMetaNameOrHex
} from '../drawingUtils'
import { ThemeVariant, type ThemeVariantType } from '@hcengineering/theme'

jest.mock('@hcengineering/theme', () => ({
  ThemeVariant: {
    Dark: 'dark',
    Light: 'light'
  }
}))

const StubPlatformColors: Record<string, { light: any, dark: any }> = {
  Firework: {
    light: {
      name: 'Firework',
      color: '#D15045',
      title: '#C03B2F',
      icon: '#D15045',
      number: '#C03B2F',
      background: '#C03B2F'
    },
    dark: {
      name: 'Firework',
      color: '#D15045',
      title: '#FFFFFF',
      icon: '#D15045',
      number: '#FFFFFF',
      background: '#C03B2F'
    }
  },
  Sky: {
    light: {
      name: 'Sky',
      color: '#4CA6EE',
      title: '#1F90EA',
      icon: '#4CA6EE',
      number: '#1F90EA',
      background: '#1F90EA'
    },
    dark: { name: 'Sky', color: '#4CA6EE', title: '#FFFFFF', icon: '#4CA6EE', number: '#FFFFFF', background: '#1F90EA' }
  },
  Grass: {
    light: {
      name: 'Grass',
      color: '#83AF12',
      title: '#60810E',
      icon: '#83AF12',
      number: '#60810E',
      background: '#60810E'
    },
    dark: {
      name: 'Grass',
      color: '#83AF12',
      title: '#FFFFFF',
      icon: '#83AF12',
      number: '#FFFFFF',
      background: '#83AF12'
    }
  }
}
jest.mock('@hcengineering/ui', () => ({
  getPlatformColorByName: jest.fn().mockImplementation((name: string, darkTheme: boolean) => {
    const colorDefinition = StubPlatformColors[name]
    if (colorDefinition == null) {
      return undefined
    }
    return darkTheme ? colorDefinition.dark : colorDefinition.light
  })
}))

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

  describe('ThemeAwareColor', () => {
    interface ThemeTestCase {
      theme: ThemeVariantType
      expected: string
    }
    const themeUnknownColorsTestCases: ThemeTestCase[] = [
      { theme: ThemeVariant.Dark, expected: 'DarkColor' },
      { theme: ThemeVariant.Light, expected: 'LightColor' }
    ]
    it.each(themeUnknownColorsTestCases)("materialize unknown color for '$theme' theme", ({ theme, expected }) => {
      const systemUnderTest = new ThemeAwareColor('DarkColor', 'LightColor')
      const result = systemUnderTest.materialize(theme)
      expect(result).toBe(expected)
    })
    const themeKnownColorsTestCases: ThemeTestCase[] = [
      { theme: ThemeVariant.Dark, expected: StubPlatformColors.Firework.dark.color },
      { theme: ThemeVariant.Light, expected: StubPlatformColors.Firework.light.color }
    ]
    it.each(themeKnownColorsTestCases)("materialize known color for '$theme' theme", ({ theme, expected }) => {
      const systemUnderTest = new ThemeAwareColor(
        StubPlatformColors.Firework.dark.name,
        StubPlatformColors.Firework.light.name
      )
      const result = systemUnderTest.materialize(theme)
      expect(result).toBe(expected)
    })

    it('materialize hex colors', () => {
      const expectedDarkColor = '#000000'
      const expectedLightColor = '#FFFFFF'
      const systemUnderTest = new ThemeAwareColor(expectedDarkColor, expectedLightColor)

      expect(systemUnderTest.materialize(ThemeVariant.Dark)).toBe(expectedDarkColor)
      expect(systemUnderTest.materialize(ThemeVariant.Light)).toBe(expectedLightColor)
    })
  })

  describe('DrawingBoardColoringSetup', () => {
    const stubColorsList: ColorsList = [
      ['alpha', new ThemeAwareColor('#000000', '#FFFFFF')],
      ['beta', new ThemeAwareColor('#FF0000', '#00FF00')],
      ['gamma', new ThemeAwareColor('#0000FF', '#FFFF00')]
    ]

    it('construction', () => {
      const systemUnderTest = new DrawingBoardColoringSetup(stubColorsList)
      expect(systemUnderTest.allColors).toBe(stubColorsList)
    })

    it('colorByName, known color', () => {
      const systemUnderTest = new DrawingBoardColoringSetup(stubColorsList)

      const actualColor = systemUnderTest.colorByName('alpha')

      const expectedColor = stubColorsList[0][1]
      expect(actualColor).toBe(expectedColor)
    })

    it('colorByName, unknown color', () => {
      const systemUnderTest = new DrawingBoardColoringSetup(stubColorsList)

      const actualColor = systemUnderTest.colorByName('unknown' as ColorMetaName)

      expect(actualColor).toBeUndefined()
    })

    it('construction with empty list', () => {
      const systemUnderTest = new DrawingBoardColoringSetup([])

      expect(systemUnderTest.allColors).toEqual([])
      expect(systemUnderTest.colorByName('alpha')).toBeUndefined()
    })
  })

  describe('metaColorNameToHex', () => {
    const AlphaDarkColor = '#000000'
    const AlphaLightColor = '#FFFFFF'
    const testColorsList: ColorsList = [
      ['alpha', new ThemeAwareColor(AlphaDarkColor, AlphaLightColor)],
      ['beta', new ThemeAwareColor('Firework', 'Sky')],
      ['gamma', new ThemeAwareColor('Grass', 'Grass')]
    ]
    const colorsSetupStub = new DrawingBoardColoringSetup(testColorsList)

    it('hex color, 7 characters', () => {
      const hexColor = '#FF5733' as ColorMetaNameOrHex
      const actualColor = metaColorNameToHex(hexColor, ThemeVariant.Dark, colorsSetupStub)
      expect(actualColor).toBe(hexColor)
    })

    it('hex color, 4 characters', () => {
      const hexColor = '#F53' as ColorMetaNameOrHex
      const actualColor = metaColorNameToHex(hexColor, ThemeVariant.Dark, colorsSetupStub)
      expect(actualColor).toBe(hexColor)
    })

    it('meta color name, dark theme', () => {
      const colorName = 'alpha' as ColorMetaNameOrHex
      const actualColor = metaColorNameToHex(colorName, ThemeVariant.Dark, colorsSetupStub)
      expect(actualColor).toBe(AlphaDarkColor)
    })

    it('meta color name, light theme', () => {
      const colorName = 'alpha' as ColorMetaNameOrHex
      const actualColor = metaColorNameToHex(colorName, ThemeVariant.Light, colorsSetupStub)
      expect(actualColor).toBe(AlphaLightColor)
    })

    it('unknown color name', () => {
      const unknownColor = 'unknown' as ColorMetaNameOrHex
      const actualColor = metaColorNameToHex(unknownColor, ThemeVariant.Dark, colorsSetupStub)
      expect(actualColor).toBe(unknownColor)
    })

    it('should handle platform colors with same name for both themes', () => {
      const gammaColor = 'gamma' as ColorMetaNameOrHex
      const darkResult = metaColorNameToHex(gammaColor, ThemeVariant.Dark, colorsSetupStub)
      const lightResult = metaColorNameToHex(gammaColor, ThemeVariant.Light, colorsSetupStub)

      expect(darkResult).toBe('#83AF12')
      expect(lightResult).toBe('#83AF12')
    })
  })
})
