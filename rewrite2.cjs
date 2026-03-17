const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/bg-zinc-500/g, 'bg-text-muted');
content = content.replace(/text-zinc-900/g, 'text-app-bg');
content = content.replace(/bg-zinc-200/g, 'bg-text-main');
content = content.replace(/hover:bg-zinc-300/g, 'hover:bg-text-muted');
content = content.replace(/bg-zinc-300/g, 'bg-text-main');

fs.writeFileSync('src/App.tsx', content);
