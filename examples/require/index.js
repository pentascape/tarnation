const { DynamoDB } = require('aws-sdk');
const Repository = require('../../index');
const DynamoDBClient = new DynamoDB();

const pages = new Repository({
  client: DynamoDBClient,
  versions: require('./versions/page'),
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
