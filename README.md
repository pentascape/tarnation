# DynamoDB Schema Versions

A schema versioning tool for objects stored in DynamoDB tables to automatically migrate objects as they're read/written to.


## Installation

Ensure you have your SSH key for github loaded by your SSH agent.

```console
ssh-add ~/.ssh/id_rsa
```

```console
npm install --save git+ssh://github.com:pentascape/dynamodb-schema-versions.git
```


## Testing

Tests are all set up using mocha and chai run via the `npm test` command.

```console
npm test
```
