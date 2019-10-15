const Joi = require('@hapi/joi')
const ivoryShared = require('ivory-shared')
const utils = require('../../../utils/utils')
const AddressLookUp = ivoryShared.AddressLookUp

class AddressFindHandlers extends require('../../handlers') {
  get lookUpOptions () {
    const {
      addressLookUpUri: uri,
      addressLookUpUsername: username,
      addressLookUpPassword: password,
      addressLookUpKey: key
    } = utils.config

    return { uri, username, password, key, maxresults: 100 }
  }

  get lookUpEnabled () {
    const { addressLookUpEnabled = false } = utils.config
    return addressLookUpEnabled
  }

  get maxPostcodeLength () {
    return 8
  }

  get schema () {
    return Joi.object({
      postcode: Joi.string().trim().uppercase().max(this.maxPostcodeLength).regex(/^[a-z0-9\s]+$/i).required()
    })
  }

  get errorMessages () {
    return {
      postcode: {
        'any.empty': 'Enter a valid postcode',
        'any.required': 'Enter a valid postcode',
        'string.regex.base': 'Enter a valid postcode',
        'string.max': `Enter a valid postcode in ${this.maxPostcodeLength} characters or less`
      }
    }
  }

  // Overrides parent class getNextPath
  async getNextPath () {
    return this.selectAddressLink
  }

  formattedPostcode (postcode = '') {
    return postcode.toUpperCase().replace(/\s/g, '') // Capitalise and remove spaces
  }

  async lookUpAddress (postcode) {
    const address = { postcode: this.formattedPostcode(postcode) }
    const addressLookup = new AddressLookUp(this.lookUpOptions)
    const addresses = await addressLookup.lookUpByPostcode(address.postcode)
    const { errorCode, message } = addresses
    if (errorCode) {
      throw new Error(message)
    }
    address.postcodeAddressList = addresses
    return address
  }

  // Overrides parent class handleGet
  async handleGet (request, h, errors) {
    const { Address } = this
    if (!this.lookUpEnabled) {
      return h.redirect(this.manualAddressLink)
    }
    const address = await Address.get(request) || {}
    this.viewData = {
      postcode: address.postcode,
      manualAddressLink: this.manualAddressLink
    }
    return super.handleGet(request, h, errors)
  }

  // Overrides parent class handlePost
  async handlePost (request, h) {
    const { config } = utils
    const { Address } = this
    let address = await Address.get(request) || {}
    const postcode = this.formattedPostcode(request.payload.postcode)

    if (!address.postcodeAddressList || postcode !== this.formattedPostcode(address.postcode)) {
      address = await this.lookUpAddress(postcode, config)
      if (address.postcodeAddressList.message) {
        // Force an invalid postcode error
        const { error } = Joi.object({ postcode: Joi.required() }).validate({})
        return this.failAction(request, h, error)
      }
    }

    await Address.set(request, address, false)
    return super.handlePost(request, h)
  }
}

module.exports = AddressFindHandlers
