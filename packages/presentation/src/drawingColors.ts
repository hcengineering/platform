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

import { ThemeVariant, type ThemeVariantType } from '@hcengineering/theme'
import { getPlatformColorByName } from '@hcengineering/ui'
import { type ColorMetaName, type ColorMetaNameOrHex } from './drawingUtils'

export class ThemeAwareColor {
  constructor (
    private readonly darkThemeName: string,
    private readonly lightThemeName: string
  ) {}

  materialize (target: ThemeVariantType): string {
    const darkTheme = target === ThemeVariant.Dark
    const platformColorName = darkTheme ? this.darkThemeName : this.lightThemeName
    const colorDefinition = getPlatformColorByName(platformColorName, darkTheme)
    if (colorDefinition == null) {
      return platformColorName
    }
    return colorDefinition.color
  }
}

export type ColorsList = Array<[ColorMetaName, ThemeAwareColor]>

export class DrawingBoardColoringSetup {
  private readonly _colorByName: Map<ColorMetaName, ThemeAwareColor>
  constructor (private readonly _allColors: ColorsList) {
    this._colorByName = new Map<ColorMetaName, ThemeAwareColor>(_allColors)
  }

  get allColors (): ColorsList {
    return this._allColors
  }

  colorByName (name: ColorMetaName): ThemeAwareColor | undefined {
    return this._colorByName.get(name)
  }
}

export function metaColorNameToHex (
  color: ColorMetaNameOrHex,
  theme: ThemeVariantType,
  setup: DrawingBoardColoringSetup
): string {
  const backend = color as string
  if (backend.startsWith('#') && (backend.length === 7 || backend.length === 4)) {
    return backend
  }
  return setup.colorByName(color as ColorMetaName)?.materialize(theme) ?? backend
}
