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

import { type Editor } from '@tiptap/core'
import { type EmbedNodeProviderConstructor } from '../embed'

export const YoutubeEmbedProvider: EmbedNodeProviderConstructor<YoutubeEmbedUrlOptions> = (options) => ({
  buildView: async (src) => {
    const url = getEmbedUrlFromYoutubeUrl(src, options)
    if (url === undefined) return

    return (editor: Editor, root: HTMLDivElement) => {
      root.setAttribute('data-block-toolbar-mouse-lock', 'true')

      const iframe = document.createElement('iframe')
      iframe.src = url
      for (const key in options.iframe) {
        const value = (options as any)[key]
        if (value !== undefined) {
          iframe.setAttribute(key, `${value}`)
        }
      }
      root.appendChild(iframe)
      return {
        name: 'youtube'
      }
    }
  },
  autoEmbedUrl: (src: string) => {
    return getEmbedUrlFromYoutubeUrl(src, options) !== undefined
  }
})

export const isValidYoutubeUrl = (url: string): boolean => {
  return url.match(YOUTUBE_REGEX) !== null
}

export interface YoutubeEmbedUrlOptions {
  iframe: {
    allowFullscreen?: boolean
    autoplay?: boolean
    ccLanguage?: string
    ccLoadPolicy?: boolean
    controls?: boolean
    disableKBcontrols?: boolean
    enableIFrameApi?: boolean
    endTime?: number
    interfaceLanguage?: string
    ivLoadPolicy?: number
    loop?: boolean
    modestBranding?: boolean
    nocookie?: boolean
    origin?: string
    playlist?: string
    progressBarColor?: string
    startAt?: number
    rel?: number
  }
}

export const defaultYoutubeEmbedUrlOptions: YoutubeEmbedUrlOptions = {
  iframe: {
    allowFullscreen: true,
    autoplay: false,
    ccLanguage: undefined,
    ccLoadPolicy: undefined,
    controls: true,
    disableKBcontrols: false,
    enableIFrameApi: false,
    endTime: undefined,
    interfaceLanguage: undefined,
    ivLoadPolicy: 0,
    loop: false,
    modestBranding: false,
    nocookie: false,
    origin: undefined,
    playlist: undefined,
    progressBarColor: undefined,
    rel: 1
  }
}

export const getYoutubeEmbedUrl = (nocookie?: boolean, isPlaylist?: boolean): string => {
  if (isPlaylist ?? false) {
    return 'https://www.youtube-nocookie.com/embed/videoseries?list='
  }
  return nocookie ?? false ? 'https://www.youtube-nocookie.com/embed/' : 'https://www.youtube.com/embed/'
}

export const getEmbedUrlFromYoutubeUrl = (url: string, options: YoutubeEmbedUrlOptions): string | undefined => {
  const {
    allowFullscreen,
    autoplay,
    ccLanguage,
    ccLoadPolicy,
    controls,
    disableKBcontrols,
    enableIFrameApi,
    endTime,
    interfaceLanguage,
    ivLoadPolicy,
    loop,
    modestBranding,
    nocookie,
    origin,
    playlist,
    progressBarColor,
    startAt,
    rel
  } = options.iframe

  if (!isValidYoutubeUrl(url)) {
    return
  }

  // if is already an embed url, return it
  if (url.includes('/embed/')) {
    return url
  }

  // if is a youtu.be url, get the id after the /
  if (url.includes('youtu.be')) {
    const id = url.split('/').pop()

    if (id !== undefined) {
      return
    }
    return `${getYoutubeEmbedUrl(nocookie)}${id}`
  }

  const videoIdRegex = /(?:(v|list)=|shorts\/)([-\w]+)/gm
  const matches = videoIdRegex.exec(url)

  if (matches === null || (matches?.[2] ?? null) === null) {
    return
  }

  let outputUrl = `${getYoutubeEmbedUrl(nocookie, matches[1] === 'list')}${matches[2]}`

  const params = []

  if (allowFullscreen === false) {
    params.push('fs=0')
  }

  if (autoplay ?? false) {
    params.push('autoplay=1')
  }

  if (typeof ccLanguage === 'string') {
    params.push(`cc_lang_pref=${ccLanguage}`)
  }

  if (ccLoadPolicy ?? false) {
    params.push('cc_load_policy=1')
  }

  if (controls !== true) {
    params.push('controls=0')
  }

  if (disableKBcontrols ?? false) {
    params.push('disablekb=1')
  }

  if (enableIFrameApi ?? false) {
    params.push('enablejsapi=1')
  }

  if (typeof endTime === 'number') {
    params.push(`end=${endTime}`)
  }

  if (typeof interfaceLanguage === 'string') {
    params.push(`hl=${interfaceLanguage}`)
  }

  if (typeof ivLoadPolicy === 'number') {
    params.push(`iv_load_policy=${ivLoadPolicy}`)
  }

  if (loop ?? false) {
    params.push('loop=1')
  }

  if (modestBranding ?? false) {
    params.push('modestbranding=1')
  }

  if (typeof origin === 'string') {
    params.push(`origin=${origin}`)
  }

  if (typeof playlist === 'string') {
    params.push(`playlist=${playlist}`)
  }

  if (typeof startAt === 'number') {
    params.push(`start=${startAt}`)
  }

  if (typeof progressBarColor === 'string') {
    params.push(`color=${progressBarColor}`)
  }

  if (rel !== undefined) {
    params.push(`rel=${rel}`)
  }

  if (params.length > 0) {
    outputUrl += `${matches[1] === 'v' ? '?' : '&'}${params.join('&')}`
  }

  return outputUrl
}

export const YOUTUBE_REGEX =
  /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu.be|youtube-nocookie\.com))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/
export const YOUTUBE_REGEX_GLOBAL =
  /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu.be|youtube-nocookie\.com))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/g
