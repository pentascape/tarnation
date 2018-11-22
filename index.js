'use strict';
const { DynamoDB } = require('aws-sdk');
const Ajv = require('ajv');

const ajv = new Ajv();
const Converter = DynamoDB.Converter;

const versionSchema = {
  $id: '#/Version',
  $schema: 'http://json-schema.org/draft-07/schema#',
  properties: {
    $schema: {
      type: 'string',
    },
  },
  anyOf: [{
    $ref: 'http://json-schema.org/draft-07/schema#'
  }],
};
ajv.addSchema(versionSchema);


class ValidationError extends Error {
  constructor(errorsText, errors) {
    super(errorsText);
    this.errors = errors;
  }
}


class Repository {
  constructor(props) {
    Repository.validateProperties(props);
    this.client = props.client;
    this.versions = [];
    (props.versions || []).forEach(version => this.addVersion(version));
  }

  static validateProperties(props)  {
    if ( typeof props.client !== 'object' || !props.client instanceof DynamoDB ) {
      throw new Error(`Repository requires "client" property, "${props.client}" given`);
    }

    if ( props.hasOwnProperty('versions') ) {
      if ( !Array.isArray(props.versions) ) {
        throw new Error(`"versions" should be an array, ${typeof props.versions} given`);
      }
    }
  }

  addVersion(version) {
    if ( typeof version.up !== 'function' || typeof version.schema !== 'function' ) {
      throw new Error('Versions require functions "up" and "schema" to be present');
    }

    if ( version.schema().$schema !== '#/Version' || !ajv.validateSchema(version.schema()) ) {
      throw new Error('Version has invalid schema');
    }

    this.versions.push(version);
  }

  validate(item) {
    const version = this.versions.find(version => version.schema().$id === item.$schema);
    if ( !version ) {
      throw new Error('No version applied');
    }

    if ( !ajv.validate(version.schema(), item) ) {
      throw new ValidationError(ajv.errorsText(), ajv.errors);
    }

    return item;
  }

  create() {
    const latestVersion = this.versions[this.versions.length - 1];
    return { ...this._defaultValue(latestVersion.schema()), $schema: latestVersion.schema().$id };
  }

  afterLoad(item) {
    if ( !item.hasOwnProperty('$schema') || typeof item.$schema !== 'string' || item.$schema === '' ) {
      console.warn('No schema detected for object');
    }

    const currentVersionIndex = this.versions.findIndex(version => version.schema().$id === item.$schema);
    const proxyHandler = new Item({
      versions: this.versions.slice(currentVersionIndex + 1), // + 1 so we don't also get the current version.
      currentVersion: this.versions[currentVersionIndex],
    });

    return new Proxy(item, proxyHandler);
  }

  getItem(params) {
    return this.client
     .getItem(params)
      .promise()
      .then(response => {
        if ( !response.Item ) {
          return null;
        }

        return this.afterLoad(Converter.unmarshall(response.Item))
      });
  }

  query(params) {
    return this.client
      .query(params)
      .promise()
      .then(response => ({
        ...response,
        Items: response.Items.map(item => this.afterLoad(Converter.unmarshall(item)))
      }));
  }

  scan(params) {
    return this.client
      .scan(params)
      .promise()
      .then(response => ({
        ...response,
        Items: response.Items.map(item => this.afterLoad(Converter.unmarshall(item)))
      }));
  }

  _defaultValue(property) {
    if ( property.hasOwnProperty('properties') ) {
      const object = {};
      const properties = Object.keys(property.properties);
      properties.forEach(prop => {
        const propVal = this._defaultValue(property.properties[prop]);
        if ( propVal !== undefined ) {
          object[prop] = propVal;
        }
      });
      return object;
    }

    if ( property.hasOwnProperty('default') ) {
      return property.default;
    }

    if ( property.hasOwnProperty('const') ) {
      return property.const;
    }

    if ( property.hasOwnProperty('enum') && property.enum.length === 1 ) {
      return property.enum[0];
    }
  }
}


class Item {
  constructor(props) {
    if ( props === undefined ) {
      this.versions = [];
      this.currentVersion = undefined;
    } else {
      this.versions = props.versions || [];
      this.currentVersion = props.currentVersion || undefined;
    }
  }

  get(target, key) {
    if ( typeof this[key] === 'function' ) {
      return this[key].bind(this, target);
    }

    if ( typeof target[key] === 'function' ) {
      return target[key].bind(target);
    }

    return target[key] || this[key] || undefined;
  }

  canUpgrade() {
    return this.versions.length > 0;
  }

  upgrade(target) {
    if ( !this.canUpgrade() ) {
      return;
    }

    return this.versions.reduce((target, version) => {
      target = version.up(target);
      target.$schema = version.schema().$id;
      if ( !ajv.validate(version.schema(), target) ) {
        throw new Error('');
      }
      return target;
    }, target);
  }
}


module.exports = {
  ValidationError: ValidationError,
  Repository: Repository,
  Item: Item,
};
