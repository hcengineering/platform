//
// Copyright © 2020 Anticrm Platform Contributors.
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
import view from '@hcengineering/view'

const icons = require('../assets/icons.svg') as string // eslint-disable-line
loadMetadata(view.icon, {
  Table: `${icons}#table`,
  List: `${icons}#list`,
  Card: `${icons}#card`,
  Timeline: `${icons}#timeline`,
  Delete: `${icons}#delete`,
  Move: `${icons}#move`,
  MoreH: `${icons}#more-h`,
  Archive: `${icons}#archive`,
  Statuses: `${icons}#statuses`,
  Open: `${icons}#open`,
  Edit: `${icons}#edit`,
  CopyId: `${icons}#copyId`,
  CopyLink: `${icons}#copyLink`,
  Setting: `${icons}#setting`,
  ArrowRight: `${icons}#arrow-right`,
  Views: `${icons}#views`,
  Pin: `${icons}#pin`,
  Model: `${icons}#model`,
  DevModel: `${icons}#devmodel`,
  ViewButton: `${icons}#viewButton`,
  Filter: `${icons}#filter`,
  Configure: `${icons}#configure`
})
