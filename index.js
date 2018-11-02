'use strict';
const { DynamoDB } = require('aws-sdk');
const Converter = DynamoDB.Converter;


class Repository {
  constructor(props) {
    this.validateProperties(props);
    this.client = props.client;
    this.table = props.table;
    this.versions = props.versions || [];
  }

  validateProperties(props) {
    if ( typeof props.table !== 'string' || props.table === '' ) {
      throw new Error('Table should be a non-empty string value');
    }
  }

  addVersion(version) {
    this.versions.push(version);
  }

  afterLoad(item) {
    if ( !item.hasOwnProperty('$schema') || typeof item.$schema !== 'string' || item.$schema === '' ) {
      console.warn('No schema detected for object');
    }

    const currentVersionIndex = this.versions.findIndex(version => version.schema().$id === item.$schema);
    const proxyHandler = new Item({
      versions: this.versions.slice(currentVersionIndex + 1) // + 1 so we don't also get the current version.
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
      })
  }

  query(params) {
    return this.client
      .query(params)
      .promise()
      .then(response => response.Items.map(item => this.afterLoad(Converter.unmarshall(item))));
  }

  scan(params) {
    return this.client
      .scan(params)
      .promise()
      .then(response => response.Items.map(item => this.afterLoad(Converter.unmarshall(item))));
  }
}


class Item {
  constructor(props) {
    if ( props === undefined ) {
      this.versions = [];
    } else {
      this.versions = props.versions || [];
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
      return target;
    }, target);
  }
}


class Version {
  constructor() {
    if ( this.constructor.name === 'Version' ) {
      throw new Error('Version cannot be instantiated, it must be extended!');
    }

    if ( typeof this.up !== 'function' ) {
      throw new Error('Method `up` is not defined');
    }

    if ( typeof this.schema !== 'function' ) {
      throw new Error('Method `schema` is not defined')
    }
  }
}


module.exports = {
  Repository: Repository,
  Item: Item,
  Version: Version,
};
