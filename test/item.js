'use strict';

const { assert, expect } = require('chai');
const sinon = require('sinon');
const faker = require('faker');
const { Item, Version } = require('../index');

describe('Item', function () {
  it('can be instantiated with no constructor arguments', function () {
    const item = new Item();
  });

  it('can be instantiated with versions constructor arguments', function () {
    const item = new Item({versions: []});
  });
});


describe('Item.canUpgrade', function () {
  it('will return true when versions are present', function () {
    const version = class extends Version {
      up() {}
      schema() {}
    };
    const item = new Item({versions: [version]});

    assert.equal(item.canUpgrade(), true);
  });
});


describe('Item.upgrade', function () {
  it('will execute `up()` on any pending versions', function () {
    const dataItem = {
      $schema: 'foo-v0.json',
      id: faker.random.uuid(),
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
    };
    const v1 = new (class V1 extends Version {
      schema() { return {$id: 'foo-v1.json'}; }
      up(item) {
        const {first_name, last_name, ...newItem} = item;
        return { name: {first: first_name, last: last_name}, ...newItem};
      }
    });
    const v2 = new (class V2 extends Version {
      schema() { return {$id: 'foo-v2.json'}; }
      up(item) {
        return {
          ...item,
          status: 'active',
        }
      }
    });

    const v1UpSpy = sinon.spy(v1, 'up');
    const v2UpSpy = sinon.spy(v2, 'up');
    const versions = [ v1, v2 ];

    const item = new Proxy(dataItem, new Item({versions: versions}));

    const upgradeResult= item.upgrade();
    assert(v1UpSpy.calledWith(dataItem));
    const v1Item = v1.up(dataItem);
    v1Item.$schema = v1.schema().$id;
    assert(v2UpSpy.calledWith(v1Item));
    const v2Item = v2.up(v1Item);
    v2Item.$schema = v2.schema().$id;

    assert.deepEqual(upgradeResult, v2Item);
  });
});
