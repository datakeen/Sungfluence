Sungfluence.plugin({ api: 1, id: 'broken', name: 'Broken', render(api) { throw new Error('test failure inside render'); } });
