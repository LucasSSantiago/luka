import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.on('/dashboard').render('pages/dashboard').as('dashboard')
    router.post('logout', [controllers.Session, 'destroy'])

    router.post('/videos/uploads', [controllers.Videos, 'startUpload']).as('videos.uploads.start')

    router
      .post('/videos/:id/complete', [controllers.Videos, 'completeUpload'])
      .as('videos.uploads.complete')

    router.get('/videos/upload', [controllers.Videos, 'create']).as('videos.upload')
  })
  .use(middleware.auth())
