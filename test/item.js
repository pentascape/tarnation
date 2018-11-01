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


describe('Item.hasVersions', function () {
  it('will return true when versions are present', function () {
    const version = class extends Version {
      up() {}
      schema() {}
    };
    const item = new Item({versions: [version]});

    assert.equal(item.hasVersions(), true);
  });
});
