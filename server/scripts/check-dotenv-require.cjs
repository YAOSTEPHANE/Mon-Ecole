const fs = require('fs');
const s = fs.readFileSync('vercel-api.cjs', 'utf8');
console.log('require dotenv', (s.match(/require\(["']dotenv["']\)/g) || []).length);
console.log('size', s.length);
