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

import OpenAI from 'openai'
import { Tiktoken } from 'js-tiktoken'

// Based on https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
export function countTokens (messages: OpenAI.ChatCompletionMessageParam[], encoding: Tiktoken): number {
  const tokensPerMessage = 3 // every message follows <|start|>{role/name}\n{content}<|end|>\n
  const tokensPerName = 1 // every name follows <|name|>{name}<|end|>\n

  let result = 0

  for (const message of messages) {
    result += tokensPerMessage
    for (const key in message) {
      const value = message[key as keyof OpenAI.ChatCompletionMessageParam] as string
      if (value == null) continue
      result += encoding.encode(value).length
      if (key === 'name') {
        result += tokensPerName
      }
    }
  }

  result += 3 // every reply is primed with <|start|>assistant<|message|>

  return result
}
