//
// Copyright © 2026 TraceX.
// Copyright © 2026 TraceX SAS.
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

import { PlatformContext, Tool } from '@hcengineering/ai-core'
import { cardTools } from './tools/card'
import { chatTools } from './tools/chat'
import { fulltextTools } from './tools/fulltext'
import { meTools } from './tools/me'
import { objectTools } from './tools/object'

export { cardTools } from './tools/card'
export { chatTools } from './tools/chat'
export { fulltextTools } from './tools/fulltext'
export { meTools } from './tools/me'
export { objectTools } from './tools/object'

export const tools: Tool<any, any, PlatformContext, any>[] = [
  ...cardTools,
  ...chatTools,
  ...fulltextTools,
  ...objectTools,
  ...meTools
]
