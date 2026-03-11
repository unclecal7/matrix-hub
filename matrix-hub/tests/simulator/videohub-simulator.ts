import * as net from 'net';

const PORT = 9990;
// Use MATRIX_SIZE env var, or fallback to 120 (the max size specified in the plan)
const MATRIX_SIZE = parseInt(process.env.MATRIX_SIZE || '120', 10);

const clients = new Set<net.Socket>();

const state = {
  inputs: Array.from({ length: MATRIX_SIZE }, (_, i) => `Input ${i + 1}`),
  outputs: Array.from({ length: MATRIX_SIZE }, (_, i) => `Output ${i + 1}`),
  routing: Array.from({ length: MATRIX_SIZE }, (_, i) => i), // 1:1 mapping initially
  locks: Array.from({ length: MATRIX_SIZE }, () => 'U'),
};

const broadcast = (message: string, excludeClient?: net.Socket) => {
  const payload = message + '\n\n';
  clients.forEach(client => {
    if (client !== excludeClient && !client.destroyed) {
      client.write(payload);
    }
  });
};

const sendInitialDump = (socket: net.Socket) => {
  let dump = 'PROTOCOL PREAMBLE:\nVersion: 2.3\n\n';
  
  dump += `VIDEOHUB DEVICE:\nDevice present: true\nModel name: Smart Videohub ${MATRIX_SIZE}x${MATRIX_SIZE}\nVideo inputs: ${MATRIX_SIZE}\nVideo processing units: 0\nVideo outputs: ${MATRIX_SIZE}\nVideo monitoring outputs: 0\nSerial ports: 0\n\n`;
  
  dump += 'INPUT LABELS:\n';
  state.inputs.forEach((label, i) => { dump += `${i} ${label}\n`; });
  dump += '\n';
  
  dump += 'OUTPUT LABELS:\n';
  state.outputs.forEach((label, i) => { dump += `${i} ${label}\n`; });
  dump += '\n';
  
  dump += 'VIDEO OUTPUT ROUTING:\n';
  state.routing.forEach((src, dest) => { dump += `${dest} ${src}\n`; });
  dump += '\n';

  dump += 'VIDEO OUTPUT LOCKS:\n';
  state.locks.forEach((lock, dest) => { dump += `${dest} ${lock}\n`; });
  dump += '\n';

  socket.write(dump);
};

const server = net.createServer((socket) => {
  console.log(`[Simulator] Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
  clients.add(socket);
  
  sendInitialDump(socket);

  let buffer = '';

  socket.on('data', (data) => {
    buffer += data.toString();
    let splitIndex = buffer.indexOf('\n\n');
    
    while (splitIndex !== -1) {
      const block = buffer.slice(0, splitIndex);
      buffer = buffer.slice(splitIndex + 2);
      
      const lines = block.split('\n');
      if (lines.length > 0) {
        const header = lines[0];
        
        if (header === 'PING:') {
          socket.write('ACK\n\n');
        } else if (header === 'VIDEO OUTPUT ROUTING:') {
          let updates = 'VIDEO OUTPUT ROUTING:\n';
          for (let i = 1; i < lines.length; i++) {
            const [destStr, srcStr] = lines[i].split(' ');
            const dest = parseInt(destStr);
            const src = parseInt(srcStr);
            
            if (!isNaN(dest) && !isNaN(src) && dest < MATRIX_SIZE && src < MATRIX_SIZE) {
              state.routing[dest] = src;
              updates += `${dest} ${src}\n`;
            }
          }
          socket.write('ACK\n\n');
          broadcast(updates.trim());
        }
        // Simplified handling for locks and labels can be added similarly
      }
      
      splitIndex = buffer.indexOf('\n\n');
    }
  });

  socket.on('close', () => {
    console.log(`[Simulator] Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
    clients.delete(socket);
  });
  
  socket.on('error', (err) => {
    console.error(`[Simulator] Socket error:`, err.message);
  });
});

server.listen(PORT, () => {
  console.log(`[Simulator] Videohub ${MATRIX_SIZE}x${MATRIX_SIZE} Emulator listening on TCP port ${PORT}...`);
});
