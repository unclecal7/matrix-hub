import { VideohubConnector } from '../src/server/devices/VideohubConnector';

async function testPhase1() {
  console.log('Starting Phase 1 Validation...');
  
  const vh = new VideohubConnector('vh1', '127.0.0.1', 9990);
  
  vh.on('connected', () => {
    console.log('✅ Connected to Videohub Simulator');
  });

  vh.on('labelsChanged', (e) => {
    // Only log the first one to avoid noise
    if (e.index === 0) {
      console.log(`✅ Received label update: ${e.direction} ${e.index} -> ${e.label}`);
    }
  });

  vh.on('routingChanged', (e) => {
    console.log(`✅ Route changed on hardware: Dest ${e.destination} <- Source ${e.source}`);
  });

  vh.connect();

  // Wait for initial dump to process
  await new Promise(r => setTimeout(r, 500));
  
  console.log('Testing route change (Dest 5 <- Source 10)...');
  vh.route(5, 10);
  
  await new Promise(r => setTimeout(r, 500));
  
  const state = vh.getState();
  if (state.routing[5] === 10) {
    console.log('✅ Routing state successfully updated from hardware acknowledgment');
  } else {
    console.error('❌ Routing state did not update');
  }

  vh.disconnect();
  console.log('Phase 1 validation complete.');
  process.exit(0);
}

testPhase1().catch(console.error);
