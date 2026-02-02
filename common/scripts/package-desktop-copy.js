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

const fs = require('fs')
const path = require('path')

const withIcons = process.argv.includes('--with-icons')

// Run from desktop-package or qms-desktop-package directory (cwd = package dir)
const distDir = path.join(process.cwd(), 'dist')
const desktopDist = path.join(process.cwd(), '..', 'desktop', 'dist')
const desktopEnv = path.join(process.cwd(), '..', 'desktop', '.env')

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true })
}

fs.cpSync(desktopDist, distDir, { recursive: true })

if (fs.existsSync(desktopEnv)) {
  fs.cpSync(desktopEnv, path.join(distDir, '.env'))
}

if (withIcons) {
  const publicDir = path.join(distDir, 'ui', 'public')
  fs.mkdirSync(publicDir, { recursive: true })
  const srcDir = path.join(process.cwd(), 'src')
  const iconPng = path.join(srcDir, 'AppIcon.png')
  const iconIco = path.join(srcDir, 'AppIcon.ico')
  if (fs.existsSync(iconPng)) {
    fs.cpSync(iconPng, path.join(publicDir, 'AppIcon.png'))
  }
  if (fs.existsSync(iconIco)) {
    fs.cpSync(iconIco, path.join(publicDir, 'AppIcon.ico'))
  }
}
