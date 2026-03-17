const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace colors
content = content.replace(/bg-zinc-950/g, 'bg-app-bg');
content = content.replace(/bg-zinc-900\/50/g, 'bg-panel-bg');
content = content.replace(/bg-zinc-900/g, 'bg-panel-solid');
content = content.replace(/bg-zinc-800\/50/g, 'bg-panel-bg');
content = content.replace(/bg-zinc-800/g, 'bg-panel-solid');
content = content.replace(/bg-zinc-700/g, 'bg-accent-main');
content = content.replace(/hover:bg-zinc-900/g, 'hover:bg-panel-solid');
content = content.replace(/hover:bg-zinc-800/g, 'hover:bg-panel-solid');
content = content.replace(/hover:bg-zinc-700/g, 'hover:bg-accent-hover');
content = content.replace(/hover:bg-zinc-600/g, 'hover:bg-accent-hover');

content = content.replace(/border-zinc-900/g, 'border-border-subtle');
content = content.replace(/border-zinc-800\/50/g, 'border-border-subtle');
content = content.replace(/border-zinc-800/g, 'border-border-subtle');
content = content.replace(/border-zinc-700\/50/g, 'border-border-subtle');
content = content.replace(/border-zinc-700/g, 'border-border-subtle');
content = content.replace(/border-zinc-600/g, 'border-border-subtle');
content = content.replace(/focus:border-zinc-700/g, 'focus:border-accent-main');

content = content.replace(/text-zinc-100/g, 'text-text-main');
content = content.replace(/text-zinc-200/g, 'text-text-main');
content = content.replace(/text-zinc-300/g, 'text-text-main');
content = content.replace(/text-zinc-400/g, 'text-text-muted');
content = content.replace(/text-zinc-500/g, 'text-text-muted');
content = content.replace(/text-zinc-600/g, 'text-text-muted');
content = content.replace(/text-zinc-700/g, 'text-text-muted');
content = content.replace(/hover:text-zinc-100/g, 'hover:text-text-main');
content = content.replace(/hover:text-zinc-200/g, 'hover:text-text-main');
content = content.replace(/hover:text-zinc-300/g, 'hover:text-text-main');
content = content.replace(/hover:text-zinc-400/g, 'hover:text-text-muted');

content = content.replace(/placeholder-zinc-600/g, 'placeholder-text-muted');
content = content.replace(/placeholder-zinc-700/g, 'placeholder-text-muted');

content = content.replace(/ring-offset-zinc-950/g, 'ring-offset-app-bg');

fs.writeFileSync('src/App.tsx', content);
