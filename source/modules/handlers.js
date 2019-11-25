const { getNestedVal } = require('defra-hapi-utils/lib').utils
const Joi = require('@hapi/joi')

module.exports = class Handlers {
  static set server (server) {
    Handlers._server = server
  }

  static get server () {
    return Handlers._server
  }

  get server () {
    return Handlers._server
  }

  get maxFreeTextLength () {
    return 3000
  }

  async getPageHeading (request) {
    return request.route.settings.app.pageHeading
  }

  async getNextPath (request) {
    return request.route.settings.app.nextPath
  }

  async getErrorPath (request) {
    return request.route.settings.app.errorPath
  }

  async getViewName (request) {
    return request.route.settings.app.view
  }

  async getViewData () {
    return this.viewData || {} // If viewData has not been set return an empty object (so a future 'Object.assign(viewData, ...' works)
  }

  async getIsQuestionPage (request) {
    return request.route.settings.app.isQuestionPage || false
  }

  async getGoogleAnalyticsId (request) {
    return request.server.app.googleAnalyticsId
  }

  get errorMessages () {
    throw new Error(`errorMessages have not been configured within the ${this.constructor.name} class`)
  }

  validate (...args) {
    const schema = Joi.isSchema(this.schema) ? this.schema : Joi.object(this.schema)
    return schema.validate(...args)
  }

  async handleGet (request, h, errors) {
    // The default handleGet

    const pageHeading = await this.getPageHeading(request)
    const viewName = await this.getViewName(request)
    const viewData = await this.getViewData(request)
    const isQuestionPage = await this.getIsQuestionPage(request)
    const googleAnalyticsId = await this.getGoogleAnalyticsId(request)
    const { fieldname } = this
    if (errors) {
      Object.assign(viewData, request.payload)
    }
    const errorList = errors && Object.values(errors)

    return h.view(viewName, {
      googleAnalyticsId,
      pageHeading,
      isQuestionPage,
      fieldname,
      viewData,
      errors,
      errorList
    })
  }

  async handlePost (request, h) {
    // The default handlePost

    const nextPath = await this.getNextPath(request)

    return h.redirect(nextPath)
  }

  errorLink (field) {
    return `#${field}` // Can be overridden where required
  }

  async formatErrors (request, errors) {
    // Format the error messages for the view
    const [...errorMessages] = await Promise.all(errors.details.map(async ({ path, type, message }) => {
      const field = path[0]
      const error = {
        field,
        text: typeof this.errorMessages === 'function' ? (await this.errorMessages(request))[field][type] : this.errorMessages[field][type],
        href: this.errorLink(field, type)
      }
      if (!error.text) {
        // use default message if not specified
        error.text = message
      }
      return error
    }))

    return Object.values(errorMessages).reduce((prev, { field, text, href }) => {
      prev[field] = { text, href }
      return prev
    }, {})
  }

  async failAction (request, h, errors) {
    const result = await this.handleGet(request, h, await this.formatErrors(request, errors))

    return result
      .code(400)
      .takeover()
  }

  routes ({ path, app, payload, plugins }) {
    const tags = getNestedVal(app, 'tags') || []
    app.handlers = this

    const routes = [
      {
        method: 'GET',
        path,
        handler: this.handleGet,
        options: {
          app,
          tags,
          plugins,
          bind: this
        }
      }
    ]

    // Only add a post handler if there is a view
    if (app.view) {
      routes.push({
        method: 'POST',
        path,
        handler: this.handlePost,
        options: {
          app,
          tags,
          plugins,
          bind: this,
          validate: {
            payload: this.schema,
            failAction: this.failAction.bind(this)
          },
          payload: payload || this.payload
        }
      })
    }

    return routes
  }
}
