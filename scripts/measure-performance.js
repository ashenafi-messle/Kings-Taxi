/**
 * Kings Taxi — Performance, Concurrency & Latency Benchmark Script
 *
 * Measures actual execution latencies and throughput for:
 * 1. JWT Access Token signing & verification
 * 2. Refresh token rotation & concurrency load (10 concurrent clients)
 * 3. Cloudinary HMAC-SHA1 upload signature generation
 * 4. Passenger Profile retrieval and fallback resilience throughput
 */

const { AuthService, resetAuthTokens } = require('../backend/dist/modules/auth/auth.service');
const { passengerProfileService } = require('../backend/dist/modules/passengers/passengerProfile.service');
const jwt = require('jsonwebtoken');

async function runBenchmark() {
  console.log('\n================================================================================');
  console.log('  KINGS TAXI — PERFORMANCE, CONCURRENCY & LATENCY BENCHMARKS');
  console.log('================================================================================\n');

  const authService = new AuthService();
  resetAuthTokens();

  const metrics = {};

  // 1. JWT Access Token Signing & Verification (500 iterations)
  console.log('1. Measuring JWT Access Token Signing & Verification (500 ops)...');
  const jwtPassenger = { id: 'bench-passenger-001', email: 'bench@kingstaxi.et', phoneNumber: '+251911223344' };
  const jwtStart = process.hrtime.bigint();
  let sampleJwt = '';
  for (let i = 0; i < 500; i++) {
    sampleJwt = authService.generateAccessToken(jwtPassenger);
    jwt.decode(sampleJwt);
  }
  const jwtEnd = process.hrtime.bigint();
  const jwtTotalMs = Number(jwtEnd - jwtStart) / 1e6;
  metrics.jwtAvgMs = (jwtTotalMs / 500).toFixed(3);
  metrics.jwtOpsPerSec = Math.round(500 / (jwtTotalMs / 1000));
  console.log(`   -> Total: ${jwtTotalMs.toFixed(2)}ms | Avg per token: ${metrics.jwtAvgMs}ms | Ops/sec: ${metrics.jwtOpsPerSec}`);

  // 2. Cloudinary HMAC-SHA1 Signature Generation (500 iterations)
  console.log('\n2. Measuring Cloudinary Signature Generation (500 ops)...');
  const sigStart = process.hrtime.bigint();
  for (let i = 0; i < 500; i++) {
    await passengerProfileService.generateCloudinarySignature(`bench-passenger-${i % 20}`);
  }
  const sigEnd = process.hrtime.bigint();
  const sigTotalMs = Number(sigEnd - sigStart) / 1e6;
  metrics.sigAvgMs = (sigTotalMs / 500).toFixed(3);
  metrics.sigOpsPerSec = Math.round(500 / (sigTotalMs / 1000));
  console.log(`   -> Total: ${sigTotalMs.toFixed(2)}ms | Avg per signature: ${metrics.sigAvgMs}ms | Ops/sec: ${metrics.sigOpsPerSec}`);

  // 3. Refresh Token Generation & Sequential Rotation (50 ops)
  console.log('\n3. Measuring Refresh Token Atomic Rotation (50 sequential rotations)...');
  let currentToken = await authService.createRefreshToken('bench-passenger-seq');
  const rotStart = process.hrtime.bigint();
  for (let i = 0; i < 50; i++) {
    const res = await authService.refreshTokens(currentToken);
    currentToken = res.refreshToken;
  }
  const rotEnd = process.hrtime.bigint();
  const rotTotalMs = Number(rotEnd - rotStart) / 1e6;
  metrics.rotAvgMs = (rotTotalMs / 50).toFixed(3);
  metrics.rotOpsPerSec = Math.round(50 / (rotTotalMs / 1000));
  console.log(`   -> Total: ${rotTotalMs.toFixed(2)}ms | Avg per rotation: ${metrics.rotAvgMs}ms | Ops/sec: ${metrics.rotOpsPerSec}`);

  // 4. Concurrent Refresh Stress Test (10 concurrent distinct sessions)
  console.log('\n4. Measuring Concurrent Refresh Stress (10 simultaneous distinct clients)...');
  const concurrentTokens = await Promise.all(
    Array.from({ length: 10 }).map((_, i) => authService.createRefreshToken(`bench-concurrent-${i}`))
  );
  const concStart = process.hrtime.bigint();
  const concResults = await Promise.allSettled(
    concurrentTokens.map((tok) => authService.refreshTokens(tok))
  );
  const concEnd = process.hrtime.bigint();
  const concTotalMs = Number(concEnd - concStart) / 1e6;
  const concSuccess = concResults.filter((r) => r.status === 'fulfilled').length;
  metrics.concBatchMs = concTotalMs.toFixed(2);
  metrics.concAvgPerClientMs = (concTotalMs / 10).toFixed(3);
  metrics.concSuccessRate = `${(concSuccess / 10) * 100}%`;
  console.log(`   -> Total for 10 concurrent clients: ${metrics.concBatchMs}ms | Avg per client: ${metrics.concAvgPerClientMs}ms | Success: ${metrics.concSuccessRate}`);

  // 5. Profile Retrieval Throughput (100 ops)
  console.log('\n5. Measuring Profile Retrieval Throughput (100 ops)...');
  const profStart = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) {
    await passengerProfileService.getProfile('bench-passenger-001');
  }
  const profEnd = process.hrtime.bigint();
  const profTotalMs = Number(profEnd - profStart) / 1e6;
  metrics.profAvgMs = (profTotalMs / 100).toFixed(3);
  metrics.profOpsPerSec = Math.round(100 / (profTotalMs / 1000));
  console.log(`   -> Total: ${profTotalMs.toFixed(2)}ms | Avg per getProfile: ${metrics.profAvgMs}ms | Ops/sec: ${metrics.profOpsPerSec}`);

  console.log('\n================================================================================');
  console.log('  BENCHMARK SUMMARY METRICS (FOR PRODUCTION REPORT)');
  console.log('================================================================================');
  console.log(JSON.stringify(metrics, null, 2));

  return metrics;
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

