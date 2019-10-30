const Joi = require('@hapi/joi')
// const utils = require('../../../utils/utils')

class SingleOptionHandlers extends require('../../handlers') {
  get schema () {
    const validValues = this.items.map(({ value }) => value)
    return {
      [this.fieldname]: Joi.string().valid(...validValues).required()
    }
  }

  get errorMessages () {
    return {
      [this.fieldname]: {
        'any.required': this.selectError
      }
    }
  }

  async getData (request) {
    return await this.Model.get(request) || {}
  }

  async setData (request, registration) {
    return this.Model.set(request, registration)
  }

  get items () {
    throw new Error(`"items" getter must be declared in ${this.constructor.name} class`)
  }

  // Overrides parent class handleGet
  async handleGet (request, h, errors) {
    const data = await this.getData(request)
    const { fieldname, hint } = this

    // Use the payload in this special case to force the items to be displayed even when there is an error
    this.viewData = {
      hint: hint ? { text: hint } : undefined,
      items: this.items.map(({ value, text, hint, storedValue }) => {
        return {
          value: value.toString(),
          text,
          hint: hint ? { text: hint } : undefined,
          checked: storedValue === data[fieldname]
        }
      })
    }
    return super.handleGet(request, h, errors)
  }

  // Overrides parent class handlePost
  async handlePost (request, h) {
    const data = await this.getData(request)
    const { storedValue } = this.items.find(({ value }) => {
      return request.payload[this.fieldname] === value
    })
    if (this.onChange && data[this.fieldname] !== storedValue) {
      await this.onChange(data)
    }
    data[this.fieldname] = storedValue
    await this.setData(request, data)
    return super.handlePost(request, h)
  }
}

module.exports = SingleOptionHandlers
