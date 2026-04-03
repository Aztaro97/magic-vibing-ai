const { spawn } = require('child_process');

const customDomain = 'test-12345.ngrok.dev';
const args = ['http', `--domain=${customDomain}`, '8081'];

console.log('Args array:', args);
console.log('Second arg:', args[1]);
console.log('Second arg hex:', Buffer.from(args[1]).toString('hex'));
console.log('Second arg length:', args[1].length);

const ngrokProcess = spawn('ngrok', args, {
    stdio: ['ignore', 'pipe', 'pipe']
});

ngrokProcess.stdout.on('data', (data) => {
    console.log('[STDOUT]:', data.toString());
});

ngrokProcess.stderr.on('data', (data) => {
    console.error('[STDERR]:', data.toString());
});

ngrokProcess.on('error', (err) => {
    console.error('[ERROR]:', err);
});

ngrokProcess.on('exit', (code) => {
    console.log('[EXIT]:', code);
    process.exit(0);
});

setTimeout(() => {
    console.log('[TIMEOUT] Killing ngrok after 3 seconds');
    ngrokProcess.kill();
}, 3000);
