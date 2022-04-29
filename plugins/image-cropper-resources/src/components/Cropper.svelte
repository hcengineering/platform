<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
-->
<script lang="ts">
  import Cropper from 'cropperjs'
  import smartcrop from 'smartcrop'

  export let image: Blob
  export let cropSize = 1200

  let imgRef: HTMLImageElement
  let cropper: Cropper | undefined

  async function init (image: Blob) {
    const bitmap = await createImageBitmap(image)
    const canvas = document.createElement('canvas')
    canvas.height = bitmap.height
    canvas.width = bitmap.width

    const ctx = canvas.getContext('2d')

    if (ctx == null) {
      return
    }

    ctx.drawImage(bitmap, 0, 0)

    imgRef.src = canvas.toDataURL('image/jpeg', 1.0)
    imgRef.width = bitmap.width
    imgRef.height = bitmap.height

    const initialArea = (await smartcrop.crop(canvas, { width: 100, height: 100 })).topCrop

    if (cropper !== undefined) {
      cropper.destroy()
      cropper = undefined
    }
    const cropperInst = new Cropper(imgRef, {
      aspectRatio: 1,
      viewMode: 1,
      autoCrop: true,
      rotatable: false,
      ready: () => {
        const imgData = cropperInst.getImageData()
        const xC = imgData.width / bitmap.width
        const yC = imgData.height / bitmap.height

        cropperInst.setCropBoxData({
          left: initialArea.x * xC,
          top: initialArea.y * yC,
          height: initialArea.height * yC,
          width: initialArea.width * yC
        })
        cropper = cropperInst
      }
    })
  }

  export async function crop () {
    if (cropper === undefined) {
      return
    }

    const res = cropper.getCroppedCanvas({ maxWidth: cropSize, maxHeight: cropSize, imageSmoothingQuality: 'high' })

    return new Promise((resolve) =>
      res.toBlob(
        (blob) => {
          resolve(blob)
        },
        'image/jpeg',
        0.95
      )
    )
  }
</script>

<div class="w-full h-full flex">
  <img class="image" bind:this={imgRef} alt="img" />
  {#await init(image)}
    Waiting...
  {/await}
</div>

<style lang="scss">
  @import 'cropperjs/dist/cropper.min.css';

  :global(.cropper-view-box, .cropper-face) {
    border-radius: 50%;
  }

  .image {
    max-width: 100%;
    object-fit: contain;
    display: none;
  }
</style>
