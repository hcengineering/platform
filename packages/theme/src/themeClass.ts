//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { ThemeId, ThemeVariant } from './variants'

/**
 * Root CSS class for the given stored theme id.
 * {@link ThemeId.System} resolves using `systemDark` (OS preference).
 */
export function getThemeRootClass (theme: string, systemDark: boolean): string {
  switch (theme) {
    case ThemeId.Light:
      return ThemeId.Light
    case ThemeId.Dark:
      return ThemeId.Dark
    case ThemeId.DarkGray:
      return ThemeId.DarkGray
    case ThemeId.System:
      return systemDark ? ThemeVariant.Dark : ThemeVariant.Light
    default:
      return ThemeVariant.Light
  }
}
