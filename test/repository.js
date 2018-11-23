'use strict';

const { assert, expect } = require('chai');
const sinon = require('sinon');
const faker = require('faker');
const { DynamoDB } = require('aws-sdk');
const { Repository, ValidationError } = require('../index');


describe('Repository', function () {
  it('should accept an object constructor argument', function () {
    const ddbClient = new DynamoDB();
    const repository = new Repository({client: ddbClient});

    assert.equal(repository.client, ddbClient);
  });

  it('should throw an error when no client is provided', function () {
    expect(function () {
      new Repository({versions: []});
    }).to.throw(Error);
  });
});


describe('Repository.addVersion', function () {
  it('should throw an error when the defined schema is invalid', function () {
    const ddbClient = new DynamoDB();
    const repository = new Repository({client: ddbClient});

    expect(function () {
      repository.addVersion({
        schema: () => ({
          $schema: '#/Version',
          properties: 'foo.json',
        }),
        up: () => {}
      });
    }).to.throw(Error);
  });

  it('should throw an error when the defined schema does not include a `$schema` in the `properties` object', function () {
    const ddbClient = new DynamoDB();
    const repository = new Repository({client: ddbClient});

    expect(function () {
      repository.addVersion({
        schema: () => ({
          properties: {
            id: {
              type: 'string',
            }
          },
        }),
        up: () => {}
      });
    }).to.throw(Error);
  });
});


describe('Repository.getItem', function () {
  it('should raise a warning when a loaded item does not have a $schema property', function () {
    const ddbClient = new DynamoDB();
    const repository = new Repository({client: ddbClient});

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
    const repository = new Repository({client: ddbClient});

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


describe('Repository.scan', function () {
  it('should return the original response object substituting Items for proxies', function () {
    const ddbClient = new DynamoDB();
    const repository = new Repository({client: ddbClient});

    const scanStub = sinon.stub(ddbClient, 'scan');
    scanStub.returns({
      promise: () => Promise.resolve({
        Items: [
          DynamoDB.Converter.marshall({
            $schema: faker.system.commonFileName('json'),
            id: faker.random.uuid()
          })
        ]
      })
    });

    return repository.scan({})
      .then(response => {
        assert.instanceOf(response.Items, Array);
        assert.instanceOf(response.Items[0], Object);
      });
  });
});


describe('Repository.afterLoad', function () {
  it('should construct an item with versions it has not yet applied', function () {
    const ddbClient = new DynamoDB();
    const versions = [
      {
        schema: () => ({$id: 'foo-v0.json', $schema: '#/Version'}),
        up: () => {}
      },
      {
        schema: () => ({$id: 'foo-v1.json', $schema: '#/Version'}),
        up: () => {}
      },
      {
        schema: () => ({$id: 'foo-v2.json', $schema: '#/Version'}),
        up: () => {}
      }
    ];
    const getItemStub = sinon.stub(ddbClient, 'getItem');
    getItemStub.returns({
      promise: () => Promise.resolve({
        Item: DynamoDB.Converter.marshall({
          id: faker.random.uuid(),
          $schema: 'foo-v0.json',
        })
      })
    });

    const repository = new Repository({client: ddbClient, versions: versions});
    return repository.getItem({})
      .then(item => {
        assert.lengthOf(item.versions, 2);
        assert.equal(item.versions.shift(), versions[1]);
        assert.equal(item.versions.shift(), versions[2]);
      });
  });
});


describe('Repository.validate', function () {
  it('should throw an error when the specified item fails validation for it\'s specified schema', function () {
    const repository = new Repository({client: new DynamoDB(), versions: [
        {
          schema: () => ({
            $id: 'foo-v1.json',
            $schema: '#/Version',
            properties: {
              id: {
                type: 'string',
              },
              name: {
                type: 'string',
              }
            },
            additionalProperties: false,
          }),
          up: () => {},
        }
      ]});

    const object = {
      $schema: 'bar-v1.json',
      id: faker.random.uuid(),
      email: faker.internet.email(),
    };


    expect(function () {
      repository.validate(object);
    }).to.throw(Error);
  });

  it('should throw a `ValidationError` when the data item is invalid', function () {
    const repository = new Repository({client: new DynamoDB(), versions: [
        {
          schema: () => ({
            $id: 'bar-v1.json',
            $schema: '#/Version',
            properties: {
              $schema: {
                type: 'string',
              },
              id: {
                type: 'string',
              },
              name: {
                type: 'string',
              }
            },
            additionalProperties: false,
          }),
          up: () => {},
        }
      ]});

    const object = {
      $schema: 'bar-v1.json',
      id: faker.random.uuid(),
      email: faker.internet.email(),
    };

    expect(function () {
      repository.validate(object);
    }).to.throw(ValidationError);
  });

  it('should return the input object when the data item is valid', function () {
    const repository = new Repository({client: new DynamoDB(), versions: [
        {
          schema: () => ({
            $id: 'bar-v1.json',
            $schema: '#/Version',
            properties: {
              $schema: {
                type: 'string',
              },
              id: {
                type: 'string',
              },
              name: {
                type: 'string',
              }
            },
            additionalProperties: false,
          }),
          up: () => {},
        }
      ]});

    const object = {
      $schema: 'bar-v1.json',
      id: faker.random.uuid(),
      name: faker.name.firstName(),
    };

    assert.equal(object, repository.validate(object));
  });
});


describe('Repository.create', function () {
  it('should create a new object with default properties', function () {
    const repository = new Repository({client: new DynamoDB(), versions: [
        {
          schema: () => ({
            $id: 'foo-v1.json',
            $schema: '#/Version',
            type: 'object',
            properties: {
              $schema: {
                type: 'string',
                const: 'foo-v1.json',
              },
              id: {
                type: 'string',
              },
              country: {
                type: 'string',
                default: 'United Kingdom',
              }
            },
            additionalProperties: false,
          }),
          up: () => {},
        }
      ]});

    const object = repository.create();

    assert.property(object, '$schema');
    assert.propertyVal(object, '$schema', 'foo-v1.json');

    assert.property(object, 'country');
    assert.propertyVal(object, 'country', 'United Kingdom');
  });
});
