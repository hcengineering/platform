import log from 'electron-log'
import love from '@hcengineering/love'
import { setCustomCreateScreenTracks } from '@hcengineering/love-resources'
import { showPopup } from '@hcengineering/ui'
import { Track, LocalTrack, LocalAudioTrack, LocalVideoTrack, ParticipantEvent, TrackInvalidError, ScreenShareCaptureOptions, DeviceUnsupportedError, ScreenSharePresets } from 'livekit-client'
import { ipcMainExposed } from './typesUtils'

export function defineGetDisplayMedia (): void {
  if (navigator?.mediaDevices === undefined) {
    console.warn('mediaDevices API not available')
    return
  }

  if (navigator.mediaDevices.getDisplayMedia === undefined) {
    throw new DeviceUnsupportedError('getDisplayMedia not supported')
  }

  navigator.mediaDevices.getDisplayMedia = async (opts?: DisplayMediaStreamOptions): Promise<MediaStream> => {
    if (opts === undefined) {
      throw new Error('opts must be provided')
    }

    const ipcMain = ipcMainExposed()
    const sources = await ipcMain.getScreenSources()

    const hasAccess = await ipcMain.getScreenAccess()
    if (!hasAccess) {
      log.error('No screen access granted')
      throw new Error('No screen access granted')
    }

    return await new Promise<MediaStream>((resolve, reject) => {
      let wasSelected = false

      showPopup(
        love.component.SelectScreenSourcePopup,
        {
          sources
        },
        'top',
        () => {
          if (!wasSelected) {
            reject(new Error('No source selected'))
          }
        },
        (val) => {
          if (val != null) {
            wasSelected = true
            opts.video = {
              mandatory: {
                ...(typeof opts.video === 'boolean' ? {} : opts.video),
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: val
              }
            } as any
            void window.navigator.mediaDevices.getUserMedia(opts).then((stream) => {
              resolve(stream)
            })
          }
        }
      )
    })
  }
}

export function defineScreenShare (): void {
  setCustomCreateScreenTracks(async function electronCreateScreenTracks (options?: ScreenShareCaptureOptions) {
    const ipcMain = ipcMainExposed()
    const sources = await ipcMain.getScreenSources()

    const hasAccess = await ipcMain.getScreenAccess()
    if (!hasAccess) {
      log.error('No screen access granted')
      throw new Error('No screen access granted')
    }

    if (navigator.mediaDevices.getDisplayMedia === undefined) {
      throw new DeviceUnsupportedError('getDisplayMedia not supported')
    }

    return await new Promise<Array<LocalTrack>>((resolve, reject) => {
      let wasSelected = false

      showPopup(
        love.component.SelectScreenSourcePopup,
        {
          sources
        },
        'top',
        () => {
          if (!wasSelected) {
            reject(new Error('No source selected'))
          }
        },
        (val) => {
          if (val != null) {
            wasSelected = true
            if (options === undefined) {
              options = {}
            }

            if (options.resolution === undefined) {
              options.resolution = ScreenSharePresets.h1080fps30.resolution
            }

            const constraints = screenCaptureToDisplayMediaStreamOptions(options)

            if (constraints.video === undefined) {
              log.error('Wrong video options specified')
              throw new Error('Wrong video options specified')
            }

            constraints.video = {
              mandatory: {
                ...(typeof constraints.video === 'boolean' ? {} : constraints.video),
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: val
              }
            } as any

            void window.navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
              const tracks = stream.getVideoTracks()
              if (tracks.length === 0) {
                log.error('No video track found')
                throw new TrackInvalidError('No video track found')
              }
              const screenVideo = new LocalVideoTrack(tracks[0], undefined, false, {
                loggerName: this.roomOptions.loggerName,
                loggerContextCb: () => this.logContext
              })
              screenVideo.source = Track.Source.ScreenShare
              if (options?.contentHint !== undefined) {
                screenVideo.mediaStreamTrack.contentHint = options.contentHint
              }

              const localTracks: Array<LocalTrack> = [screenVideo]
              if (stream.getAudioTracks().length > 0) {
                this.emit(ParticipantEvent.AudioStreamAcquired)
                const screenAudio = new LocalAudioTrack(
                  stream.getAudioTracks()[0],
                  undefined,
                  false,
                  this.audioContext,
                  { loggerName: this.roomOptions.loggerName, loggerContextCb: () => this.logContext }
                )
                screenAudio.source = Track.Source.ScreenShareAudio
                localTracks.push(screenAudio)
              }
              resolve(localTracks)
            })
          }
        }
      )
    })
  })
}

function screenCaptureToDisplayMediaStreamOptions (
  options: ScreenShareCaptureOptions
): DisplayMediaStreamOptions {
  let videoConstraints: MediaTrackConstraints | boolean = options.video ?? true
  // treat 0 as uncapped
  if (options.resolution !== undefined && options.resolution.width > 0 && options.resolution.height > 0) {
    videoConstraints = typeof videoConstraints === 'boolean' ? {} : videoConstraints
    videoConstraints = {
      ...videoConstraints,
      width: { ideal: options.resolution.width },
      height: { ideal: options.resolution.height },
      frameRate: options.resolution.frameRate
    }
  }

  return {
    audio: options.audio ?? false,
    video: videoConstraints,
    // @ts-expect-error support for experimental display media features
    controller: options.controller,
    selfBrowserSurface: options.selfBrowserSurface,
    surfaceSwitching: options.surfaceSwitching,
    systemAudio: options.systemAudio,
    preferCurrentTab: options.preferCurrentTab
  }
}
