'use strict';
const { DynamoDB } = require('aws-sdk');
const Converter = DynamoDB.Converter;


class Repository {
  constructor(props) {
    this.validateProperties(props);
    this.client = props.client;
    this.table = props.table;
    this.migrations = [];
  }

  validateProperties(props) {
    if ( typeof props.table !== 'string' || props.table === '' ) {
      throw new Error('Table should be a non-empty string value');
    }
  }

  addVersion(migration) {
    this.migrations.push(migration);
  }

  afterLoad(item) {
    if ( !item.hasOwnProperty('$schema') || typeof item.$schema !== 'string' || item.$schema === '' ) {
      console.warn('No schema detected for object');
    }

    const currentVersionIndex = this.migrations.findIndex(migration => migration.schema.$id === item.$schema);
    const newVersions = this.migrations.slice(currentVersionIndex);
    if ( newVersions.length <= 0 ) {
      const proxyHandler = new Item();
      return new Proxy(item, proxyHandler);
    }

    const proxyHandler = new Item({
      migrations: newVersions
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

  putItem(params) {
    this.migrate(params.Item);

    return this.client
      .putItem(params)
      .promise()
      .then(response => {
      })
  }

  query(params) {
    return this.client
      .query(params)
      .promise()
      .then(response => {
        return response.Items.map(item => this.migrate(item))
      })
  }

  scan(params) {
    return this.client
      .scan(params)
      .promise()
      .then(response => {
        return response.Items.map(item => this.migrate(item))
      })
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

  get(oTarget, sKey) {
    if ( typeof this[sKey] === 'function' ) {
      return this[sKey].bind(this);
    }

    if ( typeof oTarget[sKey] === 'function' ) {
      return oTarget[sKey].bind(oTarget);
    }

    return oTarget[sKey] || undefined;
  }

  apply(target, that, args) {
    console.log('arguments', arguments);
  }

  hasVersions() {
    return this.versions.length > 0;
  }

  migrate() {
    if ( !this.hasVersions() ) {
      return;
    }
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
