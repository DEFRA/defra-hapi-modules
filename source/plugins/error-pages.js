
const { logger } = require('defra-logging-facade')
const { createError } = require('ivory-shared').joiUtilities

const errorPages = (server, options = {}) => {
  const {
    handleFailedPrecondition = (request, h) => h.redirect('/'),
    errorViewLocation = 'error-handling'
  } = options

  server.ext('onPreResponse', async (request, h) => {
    const response = request.response

    if (response.isBoom) {
      // An error was raised during
      // processing the request
      const statusCode = response.output.statusCode

      switch (statusCode) {
        case 403:
        case 404:
          return h.view(`${errorViewLocation}/${statusCode}`).code(statusCode)
        case 412: {
          return handleFailedPrecondition(request, h)
        }
        case 413: {
          return request.route.settings.validate.failAction(request, h, createError(request, 'photograph', 'binary.max'))
        }
        default:
          request.log('error', {
            statusCode: statusCode,
            data: response.data,
            message: response.message
          })

          // log an error to airbrake/errbit - the response object is actually an instanceof Error
          logger.serverError(response, request)

          // Then return the `500` view (HTTP 500 Internal Server Error )
          return h.view(`${errorViewLocation}/500`).code(500)
      }
    }
    return h.continue
  })
}

module.exports = errorPages
