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

import { loadMetadata } from '@hcengineering/platform'
import drive from '@hcengineering/drive'
import icons from '../assets/icons.svg'

loadMetadata(drive.icon, {
  DriveApplication: `${icons}#driveapplication`,
  Drive: `${icons}#drive`,
  Drives: `${icons}#drives`,
  Grid: `${icons}#grid`,
  File: `${icons}#file`,
  Folder: `${icons}#folder`,
  FolderOpen: `${icons}#folder-open`,
  FolderClosed: `${icons}#folder-closed`,
  Download: `${icons}#download`,
  Restore: `${icons}#restore`
})
