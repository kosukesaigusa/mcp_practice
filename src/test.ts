/**
 * MCP サーバーをテストするためのスクリプトです.
 */
import { spawn } from 'child_process';
import { Readable, Writable } from 'stream';

const server = spawn('node', ['--loader', 'ts-node/esm', 'src/index.ts'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 標準出力の監視
server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

// エラーの監視
server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// サーバーが終了したときの処理
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// テストリクエストを送信
const request = {
  type: 'request',
  id: '1',
  tool: 'add',
  parameters: {
    a: 5,
    b: 3
  }
};

// リクエストを送信
if (server.stdin) {
  server.stdin.write(JSON.stringify(request) + '\n');
}

// 5秒後にプロセスを終了
setTimeout(() => {
  server.kill();
}, 5000); 