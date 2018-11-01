'use strict';



class Repository {
  constructor(table) {
    this.versions = [];
    this.table = table;
    this.validateProperties();
  }

  validateProperties() {
    if ( typeof this.table !== 'string' || this.table === '' ) {
      throw new Error('Table should be a non-empty string value');
    }
  }

  addVersion(version) {

  }
}


class Version {
  constructor(schema, sequence) {
    this.schema = schema;
  }

  migrate() {
    return {};
  }
}

module.exports = {
  Repository: Repository,
};
