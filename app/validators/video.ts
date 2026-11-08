import vine from '@vinejs/vine'

const MAX_SIZE_BYTES = 250_000_000

export const initiateVideoUploadValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(150),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  originalFilename: vine.string().trim().minLength(1).maxLength(250),
  contentType: vine.literal('video/mp4'),
  sizeBytes: vine.number().withoutDecimals().positive().max(MAX_SIZE_BYTES),
})
