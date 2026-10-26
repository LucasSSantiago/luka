import vine from '@vinejs/vine'

export const signupValidator = vine.create({
  fullName: vine.string().trim(),
  email: vine.string().email().trim().maxLength(254).unique({ table: 'users', column: 'email' }),
  password: vine.string().minLength(8).maxLength(32),
  passwordConfirmation: vine.string().sameAs('password'),
  terms: vine.accepted(),
})

export const loginValidator = vine.create({
  email: vine.string().email().trim().maxLength(254),
  password: vine.string(),
})
