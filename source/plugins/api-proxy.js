const { Persistence } = require('defra-hapi-utils')
const querystring = require('querystring')
const register = function (server, options = {}) {
  const { path, tags, serviceApi } = options

  const handler = async (request) => {
    const query = querystring.stringify(request.query)
    const path = `${serviceApi}${request.path}${query ? `?${query}` : ''}`.replace('/api', '')
    const persistence = new Persistence({ path })
    return persistence.restore()
  }

  server.route({
    method: 'GET',
    path,
    handler,
    options: { tags }
  })
}

exports.plugin = {
  name: 'defra-api-proxy',
  register,
  once: true,
  pkg: require('../../package.json')
}
