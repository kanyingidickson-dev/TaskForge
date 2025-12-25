const autocannon = require('autocannon');
const http = require('http');
const { spawn } = require('child_process');

const connections = Number.parseInt(process.env.BENCH_CONNECTIONS, 10) || 50;
const duration = Number.parseInt(process.env.BENCH_DURATION, 10) || 10;

const port = Number.parseInt(process.env.PORT, 10) || 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestHealth() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method: 'GET',
        host: '127.0.0.1',
        port,
        path: '/health',
        timeout: 500,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('health timeout'));
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForServer() {
  const maxAttempts = 120;

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const code = await requestHealth();
      if (code === 200) return;
    } catch (err) {
      await sleep(100);
    }
  }

  throw new Error('server did not become ready');
}

function startServer() {
  const child = spawn(process.execPath, ['src/server.js'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
  });

  return child;
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) return resolve();

    child.once('exit', () => resolve());
    child.kill('SIGTERM');

    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
      resolve();
    }, 5_000).unref();
  });
}

(async () => {
  const child = startServer();

  child.once('exit', (code, signal) => {
    if (code !== 0) {
      console.error(new Error(`server exited early (code=${code}, signal=${signal})`));
    }
  });

  try {
    await sleep(150);
    await waitForServer();

    const target = process.env.BENCH_URL || `http://127.0.0.1:${port}/`;

    autocannon(
      {
        url: target,
        connections,
        duration,
      },
      async (err, result) => {
        await stopServer(child);

        if (err) {
          console.error(err);
          process.exit(1);
        }

        console.log(autocannon.printResult(result));
      }
    );
  } catch (err) {
    await stopServer(child);
    console.error(err);
    process.exit(1);
  }
})();
