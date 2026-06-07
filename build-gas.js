import fs from 'fs';
import path from 'path';

console.log('[GAS Builder] Starting build post-processing... 🚀✨');

// Ensure dist-gas directory exists
if (!fs.existsSync('dist-gas')) {
  fs.mkdirSync('dist-gas');
  console.log('[GAS Builder] Created dist-gas directory. 📂');
}

// Find CSS and JS bundle files in dist/assets
const assetsDir = 'dist/assets';
if (!fs.existsSync(assetsDir)) {
  console.error('[GAS Builder] Error: dist/assets directory not found! Run npm run build first. 🚨');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.endsWith('.js'));
const cssFile = files.find(f => f.endsWith('.css'));

if (!jsFile || !cssFile) {
  console.error('[GAS Builder] Error: Could not find JS or CSS bundle in dist/assets! 🚨');
  process.exit(1);
}

console.log(`[GAS Builder] Found assets: JS = ${jsFile}, CSS = ${cssFile} 🔍`);

// Read assets content
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');

// Read built index.html
let htmlContent = fs.readFileSync('dist/index.html', 'utf8');

// 1. Inline CSS content inside a style tag, replacing the link tag 🎨✨
const cssRegex = /<link[^>]*href="[^"]*\.css"[^>]*>/gi;
htmlContent = htmlContent.replace(cssRegex, `<style>${cssContent}</style>`);
console.log('[GAS Builder] Inlined CSS stylesheet into HTML. 🖌️');

// 2. Base64-encode the JS content and inject the bootstrap loader, replacing the script tag 🛡️⚡
const base64Code = Buffer.from(jsContent, 'utf8').toString('base64');
const bootstrapScript = `<script id="app-bundle" type="text/plain">${base64Code}</script>
<script>
  (function() {
    try {
      var b64 = document.getElementById('app-bundle').textContent.trim();
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      var decoded = new TextDecoder('utf-8').decode(bytes);
      var script = document.createElement('script');
      script.textContent = decoded;
      (document.head || document.documentElement).appendChild(script);
      console.log('[Bootstrap] Application bundle successfully loaded and executed. 🎉');
    } catch (e) {
      console.error('[Bootstrap] Failed to initialize application bundle:', e);
    }
  })();
</script>`;

const jsRegex = /<script[^>]*src="[^"]*\.js"[^>]*><\/script>/gi;
htmlContent = htmlContent.replace(jsRegex, bootstrapScript);
console.log('[GAS Builder] Inlined and Base64-encoded JS bundle into HTML. 📦');

// Write the transformed index.html to dist-gas/
fs.writeFileSync('dist-gas/index.html', htmlContent, 'utf8');
console.log('[GAS Builder] Saved final index.html to dist-gas/index.html 💾');

// Copy Code.js to dist-gas/Code.js
fs.copyFileSync('src/gas/Code.js', 'dist-gas/Code.js');
console.log('[GAS Builder] Copied Code.js -> dist-gas/Code.js 🔌');

// Copy appsscript.json to dist-gas/appsscript.json
fs.copyFileSync('appsscript.json', 'dist-gas/appsscript.json');
console.log('[GAS Builder] Copied appsscript.json -> dist-gas/appsscript.json ⚙️');

console.log('[GAS Builder] Build successful! Ready for clasp push. 🏆🎉');
