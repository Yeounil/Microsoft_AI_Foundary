import WebSocket from 'ws';

const apiKey = 'd41IT9nSZJwIrRWBhfkA0lAA11fcZZ1p';
const wsUrl = 'wss://websockets.financialmodelingprep.com';

console.log('[Test] Connecting to FMP WebSocket...');
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('[Test] ✓ Connected');

  const loginMessage = {
    event: 'login',
    data: {
      apiKey: apiKey
    }
  };

  console.log('[Test] Sending login message:', JSON.stringify(loginMessage));
  ws.send(JSON.stringify(loginMessage));
});

ws.on('message', (data) => {
  console.log('[Test] ✓ Message received:', data);
  try {
    const parsed = JSON.parse(data);
    console.log('[Test] Parsed:', JSON.stringify(parsed, null, 2));
  } catch {
    console.log('[Test] Could not parse as JSON');
  }
});

ws.on('error', (error) => {
  console.error('[Test] ✗ Error:', error.message);
});

ws.on('close', () => {
  console.log('[Test] Connection closed');
});

// Keep connection open for 10 seconds
setTimeout(() => {
  console.log('[Test] Closing connection');
  ws.close();
}, 10000);
