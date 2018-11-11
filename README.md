# Tarnation

[![Build Status](https://travis-ci.org/pentascape/tarnation.svg?branch=master)](https://travis-ci.org/pentascape/tarnation)

A schema versioning tool for objects stored in DynamoDB tables to automatically migrate objects as they're read/written to.


## Installation

Ensure you have your SSH key for github loaded by your SSH agent.

```console
ssh-add ~/.ssh/id_rsa
```

```console
npm install --save git+ssh://github.com:pentascape/tarnation.git
```

## Usage


### Defining Versions

Each version is just a simple object that has two methods, `up` and `schema`.

```ecmascript 6
/** versions/countries.js */

const versions = [
  {
    schema: ()_=> ({
      $id: 'document-v1.json', // Give your version an ID - typically always the document type suffixed with a version number
      $schema: '#/Version', // Version schema definitions should always use the `#/Version` schema.
      properties: { // Define all your object properties as you normally would using json-schema.
        name: {
          type: 'string'
        }
      },
    }),
    up: item => item, // First version applies no changes - always return the item as-is
  },
];

module.exports = versions;
```


### Create a Repository

```ecmascript 6
/** index.js */

const { Repository } = require('tarnation');
const { DynamoDB } = require('aws-sdk');

const dynamoDBClient = new DynamoDB();
const countries = new Repository({
  client: dynamoDBClient,
  versions: require('./versions/countries'),
});
```


### Create a New Document

```ecmascript 6
/** index.js */

const { Repository } = require('tarnation');
const { DynamoDB } = require('aws-sdk');

const dynamoDBClient = new DynamoDB();
const countries = new Repository({
  client: dynamoDBClient,
  versions: require('./versions/countries'),
});

const country = { ...countries.create(), name: 'United Kingdom' };

if ( !countries.validate(country) ) {
  return Promise.reject();
}

return dynamoDBClient
  .putItem({
    TableName: 'countries',
    Item: DynamoDB.Converter.marshall(country),
  })
  .promise();
```


### Read a Document


```ecmascript 6
/** index.js */

const { Repository } = require('tarnation');
const { DynamoDB } = require('aws-sdk');

const dynamoDBClient = new DynamoDB();
const countries = new Repository({
  client: dynamoDBClient,
  versions: require('./versions/countries'),
});

return countries
  .getItem({
    TableName: 'countries',
    Key: {
      id: DynamoDB.Converter.input('5160cf18-61a8-40fa-9fa0-0f689a6eb5c2')
    }
  })
  .promise()
  .then(item => {
    // Assume we want to ensure the document is as up to date as possible.
    // You may want to read the document before upgrading to allow for external input.
    if ( item.canUpgrade() ) {
      item = item.upgrade();
    }
    
    return item;
  });
```




## Testing

Tests are all set up using mocha and chai run via the `npm test` command.

```console
npm test
```
