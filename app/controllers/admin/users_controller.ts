import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  async index({ request, view }: HttpContext) {
    const requestedPage = Number(request.input('page', 1))
    const searchInput = request.input('search', '')
    const search = typeof searchInput === 'string' ? searchInput.trim().slice(0, 200) : ''

    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

    const users = await User.query()
      .select('id', 'full_name', 'email', 'role', 'created_at')
      .withCount('videos')
      .if(search, (query) => {
        query.where((matchingUsers) => {
          matchingUsers
            .where('full_name', 'like', `%${search}%`)
            .orWhere('email', 'like', `%${search}%`)
        })
      })
      .orderBy('id', 'desc')
      .paginate(page, 5)

    users.baseUrl('/admin/usuarios')
    users.queryString({ search })

    return view.render('pages/admin/users', { users, search })
  }
}
