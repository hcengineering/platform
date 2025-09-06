<script lang="ts">
  import core from '@hcengineering/core'
  import { Button, EditBox, Label, Modal, showPopup } from '@hcengineering/ui'

  import { getEmojiByShortCode } from '../../utils'
  import emojiPlugin, { shortcodeRegex } from '@hcengineering/emoji'
  import { createEventDispatcher } from 'svelte'
  import { getClient, MessageBox, uploadFile } from '@hcengineering/presentation'
  import { IntlString } from '@hcengineering/platform'

  const client = getClient()
  const dispatch = createEventDispatcher()
  const targetMimes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif']

  let shortcodeError: IntlString | undefined = undefined
  let imageError: IntlString | undefined = undefined
  let shortcode: string = ''
  let inputFile: HTMLInputElement
  let file: File | undefined = undefined

  async function save (): Promise<void> {
    if (file === undefined) return
    const uuid = await uploadFile(file)
    await client.createDoc(emojiPlugin.class.CustomEmoji, core.space.Workspace, {
      shortcode: shortcode.toLowerCase(),
      image: uuid
    })
    dispatch('close')
  }

  async function imageSize (imageFile: File): Promise<{ width: number, height: number }> {
    return await new Promise((resolve, reject) => {
      try {
        const fileReader = new FileReader()
        fileReader.onload = () => {
          const img = new Image()
          img.onload = () => {
            resolve({ width: img.width, height: img.height })
          }
          img.src = fileReader.result as string
        }
        fileReader.readAsDataURL(imageFile)
      } catch (e) {
        reject(e)
      }
    })
  }

  async function fileSelected (): Promise<void> {
    if (inputFile?.files === undefined || inputFile.files === null) return
    const newFile = inputFile.files[0] as File | undefined
    if (newFile === undefined || !targetMimes.includes(newFile.type)) {
      return
    }
    const size = await imageSize(newFile)
    if (size.width !== size.height) {
      imageError = emojiPlugin.string.ImageAspectError
      return
    }
    imageError = undefined
    file = newFile
    inputFile.value = ''
  }

  function onShortcodeChange (): void {
    const lowercaseShortcode = shortcode.toLowerCase()
    if (`:${lowercaseShortcode}:`.match(shortcodeRegex) === null) {
      shortcodeError = emojiPlugin.string.ShortcodeMatchError
      return
    }
    if (getEmojiByShortCode(lowercaseShortcode) !== undefined) {
      shortcodeError = emojiPlugin.string.ShortcodeExistsError
      return
    }
    shortcodeError = undefined
  }

  function showConfirmationDialog (): void {
    const isEmpty = file === undefined && shortcode.trim().length === 0
    if (isEmpty) {
      dispatch('close')
    } else {
      showPopup(
        MessageBox,
        {
          label: emojiPlugin.string.NewCustomEmojiDialogClose,
          message: emojiPlugin.string.NewCustomEmojiDialogCloseNote
        },
        'top',
        (result?: boolean) => {
          if (result === true) dispatch('close')
        }
      )
    }
  }
</script>

<input
  bind:this={inputFile}
  disabled={inputFile == null}
  type="file"
  name="file"
  id="file"
  style="display: none"
  accept={targetMimes.join(',')}
  on:change={fileSelected}
/>

<Modal
  label={emojiPlugin.string.CreateTitle}
  type={'type-popup'}
  okLabel={emojiPlugin.string.Create}
  okAction={save}
  canSave={shortcode.trim().length > 0 &&
    shortcodeError === undefined &&
    imageError === undefined &&
    file !== undefined}
  onCancel={showConfirmationDialog}
>
  <div class="flex-col">
    <div class="antiGrid">
      <div class="antiGrid-row">
        <div class="antiGrid-row__header withDesciption">
          <Label label={emojiPlugin.string.Shortcode} />
          <span><Label label={emojiPlugin.string.ShortcodeDescription} /></span>
        </div>
        <div class="padding">
          <EditBox
            id="teamspace-title"
            bind:value={shortcode}
            placeholder={emojiPlugin.string.Shortcode}
            kind={'large-style'}
            autoFocus
            on:input={onShortcodeChange}
          />
          {#if shortcodeError !== undefined}
            <div class="absolute overflow-label validation-error">
              <Label label={shortcodeError} />
            </div>
          {/if}
        </div>
      </div>
      <div class="antiGrid-row">
        <div class="antiGrid-row__header withDesciption">
          <Label label={emojiPlugin.string.Image} />
          <span><Label label={emojiPlugin.string.ImageDescription} /></span>
        </div>
        <div class="padding">
          <Button
            label={emojiPlugin.string.UploadImage}
            kind={'primary'}
            size={'medium'}
            on:click={() => {
              inputFile.click()
            }}
          />
          {#if imageError !== undefined}
            <div class="absolute overflow-label validation-error">
              <Label label={imageError} />
            </div>
          {/if}
        </div>
        {#if file !== undefined}
          <div class="padding">
            {file.name}
          </div>
        {/if}
      </div>
      {#if file !== undefined}
        <div class="antiGrid-row">
          <div class="antiGrid-row__header">
            <Label label={emojiPlugin.string.Preview} />
          </div>
          <div class="padding">
            <Label label={emojiPlugin.string.PreviewTextBegin} />
            <span class="emoji"><img src={URL.createObjectURL(file)} alt="" /></span>
            <Label label={emojiPlugin.string.PreviewTextEnd} />
          </div>
        </div>
      {/if}
    </div>
  </div>
</Modal>

<style lang="scss">
  .validation-error {
    color: var(--theme-warning-color);
  }
</style>
