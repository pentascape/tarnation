'use strict';
const { DynamoDB } = require('aws-sdk');
const Converter = DynamoDB.Converter;


class Repository {
  constructor(props) {
    this.validateProperties(props);
    this.client = props.client;
    this.table = props.table;
    this.versions = [];
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
    console.log(item);
    if ( !item.hasOwnProperty('$schema') || typeof item.$schema !== 'string' || item.$schema === '' ) {
      console.warn('No schema detected for object');
    }

    const currentVersionIndex = this.versions.findIndex(version => version.$id === item.$schema);
    const newVersions = this.versions.slice(currentVersionIndex);
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
      this.migrations = [];
    }
  }

  get(oTarget, sKey) {
    return oTarget[sKey] || undefined;
  }

  apply(target, that, args) {
    console.log('arguments', arguments);
  }

  hasMigrations() {
    return this.migrations.length > 0;
  }

  migrate() {
    if ( !this.hasMigrations() ) {
      return;
    }
  }
}


class Version {
  constructor(schema) {
    this.schema = schema;
  }
}

module.exports = {
  Repository: Repository,
  Item: Item,
};
