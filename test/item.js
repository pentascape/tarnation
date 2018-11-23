'use strict';

const { assert } = require('chai');
const sinon = require('sinon');
const faker = require('faker');
const { Item } = require('../index');


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
    const version = {
      up: () => ({}),
      schema: () => ({})
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
    const v1 = {
      schema: () => ({$id: 'foo-v1.json'}),
      up: function (item) {
        const {first_name, last_name, ...newItem} = item;
        return { name: {first: first_name, last: last_name}, ...newItem};
      }
    };
    const v2 = {
      schema: () => ({$id: 'foo-v2.json'}),
      up: (item) => ({ ...item, status: 'active' })
    };

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


describe('Item.get', function () {
  it('should allow retrieval of properties from an item', function () {
    const itemData = {
      $schema: 'item-v1.json',
      name: {
        first: faker.name.firstName(),
        last: faker.name.lastName(),
      }
    };
    const item = new Proxy(itemData, new Item());

    assert.equal(item.name, itemData.name);
  });
});


describe('Item.set', function () {
  it('should allow updating of properties on an item', function () {
    const itemData = {
      $schema: 'item-v1.json',
      name: {
        first: faker.name.firstName(),
        last: faker.name.lastName(),
      }
    };
    const item = new Proxy(itemData, new Item());

    const newFirstName = faker.name.firstName();
    item.name.first = newFirstName;
    item.age = faker.random.number(99);
    assert.equal(item.name.first, newFirstName);
  })
});
