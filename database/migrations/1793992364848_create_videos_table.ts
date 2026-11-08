import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'videos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').notNullable().references('id').inTable('users')
      table.string('title', 150).notNullable()
      table.string('description', 500).nullable()
      table.string('original_filename').notNullable()
      table.string('blob_name').unique().notNullable()
      table.string('content_type').notNullable()
      table.bigInteger('size_bytes')
      table.string('status', 20).notNullable().defaultTo('pending')

      table.index(['user_id'])

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
