module.exports = [
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
];
