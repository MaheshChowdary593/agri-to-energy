const fs = require('fs');
const path = require('path');
const map = {
    'lib/i18n': 'src/frontend/i18n',
    'lib/ai': 'src/backend/ai',
    'lib/auth': 'src/backend/auth',
    'lib/dynamo-store': 'src/backend/dynamo-store',
    'lib/repository': 'src/backend/repository',
    'lib/session': 'src/backend/session',
    'lib/matching': 'src/backend/matching',
    'lib/types': 'src/shared/types',
    'lib/config': 'src/shared/config',
    'lib/locations': 'src/shared/locations',
    'lib/seed': 'src/shared/seed'
};
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.next') return;
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}
walk('.').forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    for (const [k, v] of Object.entries(map)) {
        content = content.replace(new RegExp(`(@/|\\.\\./|\\.\\./\\.\\./)${k}(?=['"])`, 'g'), `$1${v}`);
    }
    // internal imports
    content = content.replace(/'\.\/types'/g, "'../shared/types'");
    content = content.replace(/'\.\/config'/g, "'../shared/config'");
    content = content.replace(/'\.\/auth'/g, "'../backend/auth'");
    content = content.replace(/'\.\/seed'/g, "'../shared/seed'");
    content = content.replace(/'\.\/repository'/g, "'../backend/repository'");
    content = content.replace(/'\.\/dynamo-store'/g, "'../backend/dynamo-store'");
    if (content !== original) {
        fs.writeFileSync(file, content);
    }
});
