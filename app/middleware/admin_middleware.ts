import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    if (!auth.user?.isAdmin) {
      return response.forbidden(
        'Você não tem permissão para acessar esta área.'
      )
    }

    return next()
  }
}