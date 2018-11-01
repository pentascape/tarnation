'use strict';

const faker = require('faker');
const { assert, expect } = require('chai');
const { Repository } = require('../index');


describe('Repository', function () {
  it('should accept a table name constructor argument', function () {
    const tableName = faker.lorem.word();
    const repository = new Repository(tableName);

    assert.equal(repository.table, tableName);
  });

  it('should throw an error when no table name is provided', function () {
    expect(function () {
      const repository = new Repository();

    }).to.throw(Error);
  });
});
