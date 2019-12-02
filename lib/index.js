const getHandlers = (path) => require(`../source/modules/${path}/handlers`)

const resources = {
  utils: require('../source/utils/utils'),
  handlers: require('../source/modules/handlers'),
  address: {
    find: { handlers: getHandlers('address/find') },
    select: { handlers: getHandlers('address/select') },
    manual: { handlers: getHandlers('address/manual') }
  },
  declaration: { handlers: getHandlers('declaration') },
  option: {
    single: { handlers: getHandlers('option/single') }
  },
  person: {
    name: { handlers: getHandlers('person/name') },
    email: { handlers: getHandlers('person/email') }
  },
  photos: {
    add: { handlers: getHandlers('photos/add') },
    check: { handlers: getHandlers('photos/check') }
  },
  version: { handlers: getHandlers('version') },
  plugins: {
    apiProxy: require('../source/plugins/api-proxy'),
    awsPhotos: require('../source/plugins/aws-photos'),
    changeYourAnswers: require('../source/plugins/change-your-answers'),
    errorPages: require('../source/plugins/error-pages'),
    routeFlow: require('../source/plugins/route-flow'),
    public: require('../source/plugins/public')
  }
}

module.exports = resources
