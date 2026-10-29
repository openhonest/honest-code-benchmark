// Network and device profiles matching the preregistration.
// Network latency is simulated via CDP. Bandwidth fixed at 10 Mbps.
// Device class: desktop (unthrottled) and mobile (Moto G Power).

export const networkProfiles = [
  { name: '0ms',   latency: 0,   downloadThroughput: -1,          uploadThroughput: -1 },
  { name: '20ms',  latency: 20,  downloadThroughput: 10_000_000 / 8, uploadThroughput: 10_000_000 / 8 },
  { name: '50ms',  latency: 50,  downloadThroughput: 10_000_000 / 8, uploadThroughput: 10_000_000 / 8 },
  { name: '100ms', latency: 100, downloadThroughput: 10_000_000 / 8, uploadThroughput: 10_000_000 / 8 },
  { name: '300ms', latency: 300, downloadThroughput: 10_000_000 / 8, uploadThroughput: 10_000_000 / 8 },
];

export const deviceProfiles = [
  { name: 'desktop', cpuThrottling: 1 },
  { name: 'mobile',  cpuThrottling: 4 },
];
