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

/** Padding for the form and the horizontal amount used to line up sibling rows (e.g. bottom links). */
export interface LoginFormLayout {
  padding: string
  /** Same as the horizontal part of `padding`; use for `margin-inline-start` on rows below the form. */
  paddingInline: string
}

export function getLoginFormLayout (docWidth: number, docHeight: number): LoginFormLayout {
  if (docWidth <= 480) {
    return { padding: '.25rem 1.25rem', paddingInline: '1.25rem' }
  }
  if (docHeight <= 820) {
    return { padding: '1rem 2rem', paddingInline: '2rem' }
  }
  return { padding: '4rem 5rem', paddingInline: '5rem' }
}

export function loginFormPadding (docWidth: number, docHeight: number): string {
  return getLoginFormLayout(docWidth, docHeight).padding
}

export function loginFormPaddingInline (docWidth: number, docHeight: number): string {
  return getLoginFormLayout(docWidth, docHeight).paddingInline
}

export function loginFormMinHeight (docHeight: number): string {
  if (docHeight <= 880) {
    return '0'
  }
  return 'min(42rem, calc(100dvh - 12rem))'
}
