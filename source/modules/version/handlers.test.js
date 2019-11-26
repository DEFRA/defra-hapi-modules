const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const lab = exports.lab = Lab.script()
const sinon = require('sinon')
const Handlers = require('../handlers')
const TestHelper = require('../../../test-helper')
const pkg = require('../../../package')

class VersionHandlers extends require('./handlers') {
  get repoPath () {
    return __dirname
  }
}

lab.experiment(TestHelper.getFile(__filename), () => {
  lab.beforeEach(({ context }) => {
    // Create a sinon sandbox to stub methods
    const sandbox = context.sandbox = sinon.createSandbox()

    sandbox.stub(Handlers.prototype, 'handleGet').value(() => {})
    sandbox.stub(Handlers.prototype, 'handlePost').value(() => {})

    const handlers = new VersionHandlers()

    handlers.viewData = { example: 'view-data' }

    const view = (name, data) => {
      // returns view data for checking
      return { [name]: data }
    }

    const h = { view }
    const request = { server: { info: {} } }

    Object.assign(context, { handlers, request, h, view })
  })

  lab.afterEach(async ({ context }) => {
    const { sandbox } = context
    // Restore the sandbox to make sure the stubs are removed correctly
    sandbox.restore()
  })

  lab.test('handleGet builds view data as expected when full name has been entered previously', async ({ context }) => {
    const { request, handlers } = context

    await handlers.handleGet(request)

    const { services, renderTimestamp } = handlers.viewData
    const { startedTimestamp, name, version, commit, hash } = services[0]

    Code.expect(name).to.equal(pkg.name)
    Code.expect(version).to.equal(pkg.version)
    Code.expect(commit).to.not.be.empty()
    Code.expect(hash).to.not.be.empty()
    Code.expect(renderTimestamp).to.not.be.empty()
    Code.expect(startedTimestamp).to.not.be.empty()
  })
})
