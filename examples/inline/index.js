const { DynamoDB } = require('aws-sdk');
const Repository = require('../../index');
const DynamoDBClient = new DynamoDB();

const pages = new Repository({
  client: DynamoDBClient,
  versions: [
    {
      schema: () => ({
        $id: 'pages-v1.json',
        type: 'object',
        properties: {
          $schema: {
            type: 'string',
            'enum': [
              'pages-v1.json'
            ]
          },
          $id: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
          slug: {
            type: 'string',
          },
          content: {
            type: 'string',
          },
        },
        required: ['$schema', '$id', 'title', 'slug', 'content']
      }),
      up: (item) => item
    },
    {
      schema: () => ({
        $id: 'pages-v1.json',
        type: 'object',
        properties: {
          $schema: {
            type: 'string',
            'enum': [
              'pages-v1.json'
            ]
          },
          $id: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
          slug: {
            type: 'string',
          },
          content: {
            type: 'string',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
              'enum': [ 'content', 'blog', 'news', ]
            }
          }
        },
        required: ['$schema', '$id', 'title', 'slug', 'content']
      }),
      up: (item) => ({...item, tags: ['content']})
    },
  ]
});


module.exports.handler = function (event) {
  pages
    .getItem({
      TableName: 'pages',
      Key: {
        id: DynamoDB.Converter.input(event.path.id)
      }
    })
    .then(page => {
      if ( page.canUpgrade() ) {
        const updatedPage = page.upgrade();
        return DynamoDBClient
          .putItem({
            TableName: 'pages',
            Item: DynamoDB.Converter.marshall(updatedPage)
          })
          .promise()
          .then(response => updatedPage);
      }
      return page;
    });
};
