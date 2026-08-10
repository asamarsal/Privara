const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
};

const files = walk('./src').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // Replace FXRP
  if (content.includes('process.env.NEXT_PUBLIC_FXRP_TOKEN_ADDRESS')) {
    content = content.replace(/process\.env\.NEXT_PUBLIC_FXRP_TOKEN_ADDRESS(?:\s*as\s*`0x\${string}`)?/g, '"0x12967a98792fc53Fb39E91d9B69917B5D32fb011"');
    changed = true;
  }
  
  // Replace USDT0
  if (content.includes('process.env.NEXT_PUBLIC_USDT0_TOKEN_ADDRESS')) {
    content = content.replace(/process\.env\.NEXT_PUBLIC_USDT0_TOKEN_ADDRESS(?:\s*as\s*`0x\${string}`)?/g, '"0xDC7E830282489f5e461C4bfC0deE292fD9591C86"');
    changed = true;
  }

  // Replace VAULT
  if (content.includes('process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS')) {
    content = content.replace(/process\.env\.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS(?:\s*as\s*`0x\${string}`)?/g, '"0xa479Bc0C4B000D0dcD6FaC3BB9E71B830eBE048E"');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Updated:', f);
  }
});
console.log('Replaced all env vars with hardcoded new addresses!');
