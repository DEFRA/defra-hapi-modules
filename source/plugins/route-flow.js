const { cloneDeep } = require('lodash')
const { logger } = require('defra-logging-facade')
const { getNestedVal } = require('defra-hapi-utils/lib').utils

class Flow {
  constructor (flowConfig, handlersDir) {
    this.flowConfig = flowConfig
    this.handlersDir = handlersDir
  }

  _getHandlersClass (node) {
    return require(`${this.handlersDir}/${node.handlers}`)
  }

  parseFlow (server) {
    Object.values(this.flowConfig).forEach((node) => {
      if (node.handlers) {
        const Handlers = this._getHandlersClass(node)

        if (!Handlers) {
          throw new Error(
            `Flow config specifies missing handlers (${node.handlers}) for path: ${node.path}`)
        }

        try {
          const handlers = new Handlers()

          const routes = handlers.routes(getRoutes.bind(handlers)(node))

          node.handlers = handlers

          routes.forEach((route) => server.route(route))
        } catch (e) {
          throw new Error(
            `Specified handlers (${node.handlers}) within the flow config for path "${node.path}" has the following error ${e.message}`)
        }
      } else {
        throw new Error(`Expected Flow config to include the handlers property for path: ${node.path}`)
      }
      switch (typeof node.next) {
        case 'string': {
          node.next = getNestedVal(this.flowConfig, node.next)
          break
        }
        case 'object': {
          const { query, result, path } = node.next
          if (query && result) {
            Object.entries(result).forEach(([key, val]) => {
              result[key] = getNestedVal(this.flowConfig, val)
            })
          } else {
            if (!path) {
              throw new Error(`Flow config not valid for path: ${node.path}`)
            }
          }
          break
        }
      }
    })
  }
}

function getRoutes (node) {
  // Override getNextPath
  this.getNextPath = async (request) => {
    const { next = {} } = node
    if (next.path) {
      return next.path
    }
    if (next.query) {
      const query = this[next.query]
      if (query) {
        if (typeof query === 'function') {
          const val = await query.bind(this)(request)
          const result = next.result[val.toString()]
          if (result && result.path) {
            return result.path
          } else {
            throw new Error(
              `Expected route class ${this.constructor.name} to have a result after function "${next.query}" executed`)
          }
        } else {
          throw new Error(`Expected route class ${this.constructor.name} to have function "${next.query}" declared`)
        }
      }
    }
  }

  const { pageHeading } = node

  if (pageHeading) {
    // Override getPageHeading
    this.getPageHeading = async (request) => {
      if (typeof pageHeading === 'string') {
        return pageHeading
      }
      if (pageHeading && pageHeading.query) {
        const query = this[pageHeading.query]
        if (typeof query === 'function') {
          const val = await query.bind(this)(request)
          const result = pageHeading.result[val.toString()]
          if (result) {
            return result
          } else {
            throw new Error(
              `Expected route class ${this.constructor.name} to have a result after function "${pageHeading.query}" executed`)
          }
        } else {
          throw new Error(
            `Expected route class ${this.constructor.name} to have function "${pageHeading.query}" declared`)
        }
      }
    }
  }
  const { path, isQuestionPage = false, view, tags = [] } = node
  return {
    path,
    app: {
      view,
      isQuestionPage,
      tags
    }
  }
}

const flow = {
  register: (server, options = {}) => {
    const { flowConfig, handlersDir } = options
    flow.flowConfig = flowConfig

    if (flowConfig) {
      flow._flow = new Flow(cloneDeep(flowConfig), handlersDir)
      flow._flow.parseFlow(server)
    } else {
      logger.warn('No flow config was added')
    }
  },
  Flow,
  get flow () {
    return flow._flow ? flow._flow.flowConfig : flow.flowConfig
  }
}

exports.plugin = {
  name: 'defra-common-flow',
  register: flow.register,
  once: true,
  pkg: require('../../package.json')
}

exports.test = {
  Flow: flow.Flow
}

exports.flow = () => flow.flow
