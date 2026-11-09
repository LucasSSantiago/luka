import AzureBlobService from '#services/azure_blob_service'
import { initiateVideoUploadValidator } from '#validators/video'
import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'

export default class VideosController {
  private readonly storage = new AzureBlobService()

  async create({ view }: HttpContext) {
    return view.render('pages/videos/upload')
  }

  async startUpload({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()

    const payload = await request.validateUsing(initiateVideoUploadValidator)

    const blobName = `videos/${randomUUID()}.mp4`

    const authorization = await this.storage.generateUploadUrl(blobName)

    const video = await user.related('videos').create({
      title: payload.title,
      description: payload.description ?? null,
      originalFilename: payload.originalFilename,
      contentType: payload.contentType,
      blobName,
      sizeBytes: null,
      status: 'pending',
    })

    response.header('cache-control', 'no-store')

    return response.created({
      videoId: video.id,
      uploadUrl: authorization.uploadUrl,
      expiresAt: authorization.expiresAt,
    })
  }

  async completeUpload({ params, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()

    const video = await user.related('videos').query().where('id', params.id).firstOrFail()

    if (video.status === 'ready') {
      return response.ok({
        videoId: video.id,
        status: video.status,
      })
    }

    if (video.status !== 'pending') {
      return response.conflict({ message: 'o video não está aguardando upload' })
    }

    try {
      const properties = await this.storage.getBlobProperties(video.blobName)

      const sizeBytes = properties.sizeBytes

      if (
        typeof sizeBytes !== 'number' ||
        !Number.isInteger(sizeBytes) ||
        sizeBytes <= 0 ||
        sizeBytes > 250_000_000
      ) {
        return response.unprocessableEntity({
          message: 'o arquivo deve ter entre 1 e 250mb',
        })
      }

      if (properties.contentType !== 'video/mp4') {
        return response.unprocessableEntity({
          message: 'O tipo declarado do arquivo deve ser video/mp4.',
        })
      }

      video.sizeBytes = sizeBytes
      video.contentType = properties.contentType
      video.status = 'ready'

      await video.save()

      return response.ok({
        videoId: video.id,
        status: video.status,
      })
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'BlobNotFound') {
        return response.conflict({
          message: 'O arquivo ainda não foi encontrado. Conclua o envio antes de confirmar',
        })
      }

      throw error
    }
  }
}
