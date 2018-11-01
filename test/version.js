'use strict';

const { expect } = require('chai');
const { Version } = require('../index');


describe('Version', function () {
  it('can\'t be instantiated on it\'s own', function () {
    expect(function () {
      new Version();
    }).to.throw(Error, 'Version cannot be instantiated, it must be extended!');
  });

  it('can be extended', function () {
    expect(function () {
      const V1 = class extends Version {
        up() {}
        schema() {}
      };
      new V1();
    }).not.to.throw(Error);
  });

  it('will throw an error if the method `up` is not implemented', function () {
    expect(function () {
      const V1 = class extends Version {
        schema() {}
      };
      new V1();
    }).to.throw(Error, 'Method `up` is not defined');
  });

  it('will throw an error if the method `schema` is not implemented', function () {
    expect(function () {
      const V1 = class extends Version {
        up() {}
      };
      new V1();
    }).to.throw(Error, 'Method `schema` is not defined');
  });
});
