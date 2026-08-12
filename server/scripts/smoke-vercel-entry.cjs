const app = require('../index.cjs');
console.log('type', typeof app, typeof app.listen);
const s = require('http').createServer(app);
s.listen(0, function () {
  const p = this.address().port;
  require('http')
    .get({ host: '127.0.0.1', port: p, path: '/health' }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => {
        console.log('health', r.statusCode, d);
        s.close();
      });
    })
    .on('error', (e) => {
      console.error(e);
      s.close();
      process.exitCode = 1;
    });
});
