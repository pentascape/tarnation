'use strict';

const { assert, expect } = require('chai');
const sinon = require('sinon');
const faker = require('faker');
const { DynamoDB } = require('aws-sdk');
const { Repository, Version } = require('../index');


describe('Repository', function () {
  it('should accept an object constructor argument', function () {
    const ddbClient = new DynamoDB();
    const tableName = faker.lorem.word();
    const repository = new Repository({client: ddbClient, table: tableName});

    assert.equal(repository.table, tableName);
    assert.equal(repository.client, ddbClient);
  });

  it('should throw an error when no table name is provided', function () {
    expect(function () {
      const ddbClient = new DynamoDB();
      new Repository({client: ddbClient});
    }).to.throw(Error);
  });
});


describe('Repository.getItem', function () {
  it('should raise a warning when a loaded item does not have a $schema property', function () {
    const ddbClient = new DynamoDB();
    const tableName = faker.lorem.word();
    const repository = new Repository({client: ddbClient, table: tableName});

    const consoleWarnSpy = sinon.stub(console, 'warn');
    const getItemStub = sinon.stub(ddbClient, 'getItem');
    getItemStub.returns({
      promise: () => Promise.resolve({
        Item: DynamoDB.Converter.marshall({
          id: faker.random.uuid()
        })
      })
    });

    return repository.getItem({})
      .catch(() => {})
      .then(() => {
        assert(consoleWarnSpy.called);
        console.warn.restore();
      });
  });

  it('should return an `Item` object for a retrieved item', function () {
    const ddbClient = new DynamoDB();
    const tableName = faker.lorem.word();
    const repository = new Repository({client: ddbClient, table: tableName});

    const getItemStub = sinon.stub(ddbClient, 'getItem');
    getItemStub.returns({
      promise: () => Promise.resolve({
        Item: DynamoDB.Converter.marshall({
          $schema: faker.system.commonFileName('json'),
          id: faker.random.uuid()
        })
      })
    });

    return repository.getItem({})
      .then(item => {
        assert.instanceOf(item, Object);
      });
  });
});


describe('Repository.afterLoad', function () {
  it('should construct an item with versions it has not yet applied', function () {
    const ddbClient = new DynamoDB();
    const tableName = faker.lorem.word();
    class V0 extends Version {
      schema() { return {$id: 'foo-v0.json'}; }
      up() {}
    }
    class V1 extends Version {
      schema() { return {$id: 'foo-v1.json'}; }
      up() {}
    }
    class V2 extends Version {
      schema() { return {$id: 'foo-v2.json'}; }
      up() {}
    }
    const versions = [ new V0, new V1, new V2 ];
    const getItemStub = sinon.stub(ddbClient, 'getItem');
    getItemStub.returns({
      promise: () => Promise.resolve({
        Item: DynamoDB.Converter.marshall({
          id: faker.random.uuid(),
          $schema: 'foo-v0.json',
        })
      })
    });

    const repository = new Repository({client: ddbClient, table: tableName, versions: versions});
    return repository.getItem({})
      .then(item => {
        assert.lengthOf(item.versions, 2);
        assert.instanceOf(item.versions.shift(), V1);
        assert.instanceOf(item.versions.shift(), V2);
      });
  });
});
