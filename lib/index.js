const getHandler = (path) => {
  if (path) {
    return require(`../source/modules/${path}/handlers`)
  } else {
    return require('../source/modules/handlers')
  }
}

module.exports = {
  handlers: getHandler(),
  address: {
    find: { handlers: getHandler('address/find') },
    select: { handlers: getHandler('address/select') },
    manual: { handlers: getHandler('address/manual') }
  },
  declaration: { handlers: getHandler('declaration') },
  option: {
    single: { handlers: getHandler('option/single') }
  },
  person: {
    name: { handlers: getHandler('person/name') },
    email: { handlers: getHandler('person/email') }
  }
}
