const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const lab = exports.lab = Lab.script()
const sinon = require('sinon')
const routeFlow = require('./route-flow')
const { getNestedVal } = require('defra-hapi-utils').utils

const flowConfig = {
  home: {
    path: '/',
    handlers: 'home/home.handlers.js',
    next: 'first-page'
  },

  'first-page': {
    path: '/first-page',
    handlers: 'pages/first-page.handlers.js',
    view: 'pages/first-page',
    pageHeading: 'First Page',
    next: 'second-page'
  },

  'second-page': {
    path: '/second-page',
    handlers: 'page/second-page',
    view: 'pages/second-page',
    pageHeading: 'Second Page',
    next: {
      query: 'skipsNextPage',
      result: {
        false: 'third-page',
        true: 'fourth-page'
      }
    }
  },

  'third-page': {
    path: '/third-page',
    handlers: 'pages/third-page.handlers.js',
    view: 'pages/third-page',
    pageHeading: 'Third Page',
    next: 'fourth-page'
  },

  'fourth-page': {
    path: '/fourth-page',
    handlers: 'pages/fourth-page.handlers.js',
    view: 'pages/fourth-page',
    pageHeading: {
      query: 'isLastPage',
      result: {
        true: 'Last Page',
        false: 'Fourth Page'
      }
    }
  }
}

class Handlers extends require('../modules/handlers') {
  isLastPage () { return true }
  skipsNextPage () { return true }
}

const TestHelper = require('../../test-helper')

lab.experiment(TestHelper.getFile(__filename), () => {
  lab.beforeEach(async ({ context }) => {
    // Create a sinon sandbox to stub methods
    const sandbox = context.sandbox = sinon.createSandbox()

    const { plugin, test } = routeFlow
    sandbox.stub(test.Flow.prototype, '_getHandlersClass').value(() => Handlers)

    context.server = {
      app: { routes: [] },
      route: (route) => {
        context.server.app.routes.push(route)
      }
    }

    context.options = {
      flowConfig: { ...flowConfig }
    }

    const { server, options } = context
    await plugin.register(server, options)
  })

  lab.afterEach(async ({ context }) => {
    const { sandbox } = context
    // Restore the sandbox to make sure the stubs are removed correctly
    sandbox.restore()
  })

  Object.entries(flowConfig).forEach(([routeName, config]) => {
    lab.test(`Testing config for "${routeName}"`, async ({ context }) => {
      const { app } = context.server
      const routes = app.routes.filter((route) => route.path === config.path)

      Code.expect(routes.length).to.not.equal(0)

      const getRoute = routes.find(({ method }) => method === 'GET')
      Code.expect(getRoute).to.not.equal(undefined)
      Code.expect(getRoute.handler).to.equal(Handlers.prototype.handleGet)

      const postRoute = routes.find(({ method }) => method === 'POST')
      if (config.view) {
        Code.expect(postRoute).to.not.equal(undefined)
        Code.expect(postRoute.handler).to.equal(Handlers.prototype.handlePost)
      } else {
        Code.expect(postRoute).to.equal(undefined)
      }
    })
  })

  lab.test('Make sure dynamic "getPageHeading" works as expected', async ({ context }) => {
    const config = flowConfig['fourth-page']

    Code.expect(config.path).to.equal('/fourth-page')

    const { app } = context.server
    const routes = app.routes.filter((route) => route.path === config.path)

    const postRoute = routes.find(({ method }) => method === 'POST')
    Code.expect(postRoute).to.not.equal(undefined)

    const handlers = getNestedVal(postRoute, 'options.app.handlers')
    Code.expect(handlers).to.not.equal(undefined)

    Code.expect(typeof handlers.getPageHeading).to.equal('function')
    Code.expect(await handlers.getPageHeading()).to.equal('Last Page')
  })

  lab.test('Make sure dynamic "getNextPath" works as expected', async ({ context }) => {
    const config = flowConfig['second-page']

    Code.expect(config.path).to.equal('/second-page')

    const { app } = context.server
    const routes = app.routes.filter((route) => route.path === config.path)

    const postRoute = routes.find(({ method }) => method === 'POST')
    Code.expect(postRoute).to.not.equal(undefined)

    const handlers = getNestedVal(postRoute, 'options.app.handlers')
    Code.expect(handlers).to.not.equal(undefined)

    Code.expect(typeof handlers.getNextPath).to.equal('function')
    Code.expect(await handlers.getNextPath()).to.equal('/fourth-page')
  })
})
