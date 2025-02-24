//
// Copyright © 2024 Hardcore Engineering Inc.
//
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import { P12Signer } from '@signpdf/signer-p12'
import signpdf from '@signpdf/signpdf'
import { PDFDocument, StandardFonts, degrees, degreesToRadians, rgb } from 'pdf-lib'

interface Rect {
  x: number
  y: number
  width: number
  height: number
  options?: {
    rotate?: number
  }
}

interface Options {
  name: string
  contactInfo: string
  appName: string
  reason: string
  location: string
}

interface Context {
  title: string
}

/**
 * Signs a PDF document.
 * @public
 * @returns Buffer with the signed content.
 */
export async function signPDF (file: Buffer, certp12: Buffer, pwd: string, ctx: Context): Promise<Buffer | undefined> {
  const rect: Rect = {
    x: 50,
    y: 70,
    width: 200,
    height: 40,
    options: {
      rotate: -3 // Currently only supports [-90;0] range for the sake of simplicity
    }
  }

  // Hardcoded options for signing on export.
  // Make it configurable when will be needed to allow signing for different reasons.
  const options: Options = {
    name: ctx.title,
    contactInfo: 'anticrm@hc.engineering',
    appName: ctx.title,
    reason: 'Export from the system',
    location: 'N/A'
  }
  // Just display some information that will become a visible part of the signature.
  // It has nothing to do with the signature itself, it's just placed on top of the
  // signature widget which will mean clicking on this content will pop up the info
  // about the signature and the ceritifcate in applications that allow verifying PDF signatures.
  const pdfDoc = await drawManifestation(file, options, rect)

  const deg = rect.options?.rotate ?? 0
  const shiftRate = -Math.sin(degreesToRadians(deg))
  const shiftWidth = rect.height * shiftRate
  const shiftHeight = rect.width * shiftRate

  // The PDF needs to have a placeholder for a signature to be added.
  pdflibAddPlaceholder({
    pdfDoc,
    widgetRect: [rect.x, rect.y - shiftHeight, rect.x + rect.width + shiftWidth, rect.y + rect.height],
    ...options
  })

  const preparedDoc = await pdfDoc.save()
  const signer = new P12Signer(certp12, { passphrase: pwd })

  return await signpdf.sign(preparedDoc, signer)
}

async function drawManifestation (file: Buffer, options: Options, rect: Rect): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.load(file)

  // Embed the Helvetica font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const color = rgb(77 / 255, 176 / 255, 224 / 255) // some blue stamp color emulating wet inc
  const deg = rect.options?.rotate ?? 0
  const rotate = degrees(deg)

  // Get the first page of the document
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]

  firstPage.drawRectangle({
    ...rect,
    borderWidth: 0.5,
    borderColor: color,
    rotate
  })

  // Include options
  const x = rect.x + 8
  let y = rect.y + rect.height - 16
  const size = 11
  const lineHeight = 14
  const font = helveticaFont

  const lines = [`Exported from ${options.appName}`, `Date: ${new Date().toISOString()}`]

  const shiftRate = -Math.sin(degreesToRadians(deg))

  lines.forEach((line) => {
    firstPage.drawText(line, {
      x: x + (y - rect.y) * shiftRate,
      y,
      size,
      font,
      color,
      lineHeight,
      maxWidth: rect.width - 10,
      rotate
    })
    y -= lineHeight
  })

  return pdfDoc
}
