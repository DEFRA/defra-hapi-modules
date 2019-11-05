const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Joi = require('@hapi/joi')
const lab = exports.lab = Lab.script()
const sinon = require('sinon')
const { createError } = require('../utils/utils')
const TestHelper = require('../../test-helper')

class Handlers extends require('./handlers') {
  get schema () {
    return Joi.object({ config: 'schema config' })
  }

  get errorMessages () {
    return {
      'field-name': {
        'error.type': 'error message'
      }
    }
  }
}

lab.experiment(TestHelper.getFile(__filename), () => {
  lab.beforeEach(({ context }) => {
    // Create a sinon sandbox to stub methods
    context.sandbox = sinon.createSandbox()

    const handlers = new Handlers()

    handlers.viewData = { example: 'view-data' }
    handlers.fieldname = 'field-name'

    const app = {
      view: 'view-name',
      pageHeading: 'page-heading',
      nextPath: 'next-path',
      errorPath: 'error-path',
      isQuestionPage: true,
      tags: ['first', 'second']
    }

    const googleAnalyticsId = 'UA-68732487234'

    const settings = { app }
    const route = { settings }
    const server = { app: { googleAnalyticsId } }
    const request = { route, server }

    const view = (name, data) => {
      // returns view data for checking
      return { [name]: data }
    }

    const redirect = (nextPath) => {
      // returns redirect data for checking
      return nextPath
    }

    const h = { view, redirect }

    Object.assign(context, { handlers, app, settings, route, request, h, view })
  })

  lab.afterEach(async ({ context }) => {
    const { sandbox } = context
    // Restore the sandbox to make sure the stubs are removed correctly
    sandbox.restore()
  })

  lab.test('handleGet builds view data as expected', async ({ context }) => {
    const { request, handlers, h, app } = context

    const { pageHeading, isQuestionPage } = app
    const { viewData, fieldname } = handlers
    const { googleAnalyticsId } = request.server.app
    const errors = undefined
    const errorList = undefined

    request.payload = { extraData: 'extra-data' }

    const result = await handlers.handleGet(request, h)

    Code.expect(result).to.equal({
      'view-name': { pageHeading, isQuestionPage, fieldname, googleAnalyticsId, viewData, errors, errorList }
    })
  })

  lab.test('handlePost redirects as expected', async ({ context }) => {
    const { request, handlers, h, app } = context

    const nextPath = await handlers.handlePost(request, h)
    Code.expect(nextPath).to.equal(app.nextPath)
  })

  lab.test('default error structure as expected', async ({ context }) => {
    const { request, handlers } = context
    const { fieldname } = handlers

    const message = 'default error message'
    request.response = { message }

    const result = await handlers.formatErrors(request, createError(request, fieldname, 'unknown.error.type'))

    Code.expect(result).to.equal({ 'field-name': { text: `"${fieldname}" ${message}`, href: `#${fieldname}` } })
  })

  lab.test('handleGet builds view data as expected when there are errors', async ({ context }) => {
    const { request, handlers, h, app } = context

    const { pageHeading, isQuestionPage } = app
    const { viewData, fieldname } = handlers
    const { googleAnalyticsId } = request.server.app

    const errors = { 'field-name': { text: 'error message', href: '#field-name' } }
    const errorList = Object.values(errors)

    request.payload = { extraData: 'extra-data' }

    const result = await handlers.handleGet(request, h, errors)

    Code.expect(result).to.equal({
      'view-name': { pageHeading, isQuestionPage, fieldname, googleAnalyticsId, viewData, errors, errorList }
    })

    // payload should be merged when in error
    Code.expect(viewData).to.equal({ example: 'view-data', extraData: 'extra-data' })
  })

  lab.test('routes builds the correct hapi route structure', async ({ context }) => {
    const { app, handlers } = context
    const { tags } = app
    const { schema, handleGet, handlePost, failAction } = handlers
    const path = '/test-path'
    const payload = {
      data: 'stuff'
    }
    const plugins = {
      plugin: false // disabled plugin
    }
    const routes = handlers.routes({ path, app, payload, plugins })

    Code.expect(routes).to.equal([
      {
        method: 'GET',
        path,
        handler: handleGet,
        options: {
          app,
          tags,
          plugins,
          bind: handlers
        }
      },
      {
        method: 'POST',
        path,
        handler: handlePost,
        options:
          {
            app,
            tags,
            plugins,
            bind: handlers,
            validate: {
              failAction: failAction.bind(handlers),
              payload: schema
            },
            payload
          }
      }
    ])
  })
})
