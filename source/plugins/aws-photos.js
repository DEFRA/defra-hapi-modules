const { Photos } = require('defra-hapi-utils')

const register = async function (server, options = {}) {
  const { path, alternativeSizes, region, apiVersion, bucket, tags, enabled } = options
  const { small, medium } = alternativeSizes

  const photos = new Photos({ region, apiVersion, bucket, small, medium, enabled })

  const handler = async (request, h) => {
    const filename = encodeURIComponent(request.params.filename)
    const size = encodeURIComponent(request.params.size)

    // Get the photo and return with headers
    const photo = await photos.get(filename, size)
    return h.response(photo.Body).type(photo.ContentType)
  }

  server.route({
    method: 'GET',
    path: `${path}/{size}/{filename}`,
    handler,
    options: { tags }
  })
}

exports.plugin = {
  name: 'defra-aws-photos',
  register,
  once: true,
  pkg: require('../../package.json')
}
