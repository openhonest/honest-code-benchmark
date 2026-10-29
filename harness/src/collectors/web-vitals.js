// Web vitals metric collector.
//
// Implements the collector interface:
//   initScript    - JS string injected before page load via addInitScript
//   beforeRun()   - called after page creation, before navigation (receives page + cdpSession)
//   afterRun()    - called after the interaction sequence settles (receives page + cdpSession)
//
// A researcher who needs different metrics (Lighthouse, React Profiler, CrUX)
// writes a collector with the same three exports and passes it to the runner.

export const initScript = `
  window.__harness = {
    longTasks: [],
    eventEntries: [],
    lcpEntries: [],
    layoutShifts: [],
  };

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__harness.longTasks.push({
        startTime: entry.startTime,
        duration: entry.duration,
      });
    }
  }).observe({ type: 'longtask', buffered: true });

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__harness.eventEntries.push({
        name: entry.name,
        startTime: entry.startTime,
        duration: entry.duration,
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
        interactionId: entry.interactionId,
      });
    }
  }).observe({ type: 'event', buffered: true, durationThreshold: 0 });

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__harness.lcpEntries.push({
        startTime: entry.startTime,
        size: entry.size,
        element: entry.element?.tagName || null,
      });
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        window.__harness.layoutShifts.push({
          value: entry.value,
          startTime: entry.startTime,
        });
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
`;

export async function beforeRun(page, cdpSession) {
  await cdpSession.send('Network.enable');
  await cdpSession.send('Performance.enable', { timeDomain: 'timeTicks' });
}

export async function afterRun(page, cdpSession) {
  const pageMetrics = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');

    const lcpEntries = window.__harness.lcpEntries;
    const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1] : null;

    const ttfb = nav ? nav.responseStart - nav.requestStart : null;
    const fcpTime = fcp ? fcp.startTime : null;
    const lcpTime = lcp ? lcp.startTime : null;

    let serverTiming = null;
    if (nav && nav.serverTiming) {
      serverTiming = {};
      for (const st of nav.serverTiming) {
        serverTiming[st.name] = st.duration;
      }
    }

    const longTasks = window.__harness.longTasks;

    let tti = null;
    let tbt = 0;
    if (fcpTime !== null && longTasks.length > 0) {
      const tasksAfterFcp = longTasks
        .filter(t => t.startTime >= fcpTime)
        .sort((a, b) => a.startTime - b.startTime);

      const now = performance.now();
      let quietStart = fcpTime;
      for (const task of tasksAfterFcp) {
        if (task.startTime - quietStart >= 5000) break;
        quietStart = task.startTime + task.duration;
      }
      tti = quietStart;

      for (const task of tasksAfterFcp) {
        if (task.startTime + task.duration <= tti) {
          tbt += Math.max(0, task.duration - 50);
        }
      }
    } else if (fcpTime !== null) {
      tti = fcpTime;
    }

    const eventEntries = window.__harness.eventEntries;
    let inp = null;
    if (eventEntries.length > 0) {
      const byInteraction = new Map();
      for (const e of eventEntries) {
        if (e.interactionId === 0) continue;
        const current = byInteraction.get(e.interactionId) || 0;
        byInteraction.set(e.interactionId, Math.max(current, e.duration));
      }
      const durations = [...byInteraction.values()].sort((a, b) => a - b);
      if (durations.length > 0) {
        const idx = Math.min(
          Math.ceil(durations.length * 0.98) - 1,
          durations.length - 1
        );
        inp = durations[idx];
      }
    }

    // CLS: session-window algorithm (1s gap, 5s cap, largest window wins)
    const shifts = window.__harness.layoutShifts;
    let cls = 0;
    if (shifts.length > 0) {
      let windowStart = shifts[0].startTime;
      let prevTime = shifts[0].startTime;
      let windowSum = 0;
      let maxWindow = 0;
      for (let i = 0; i < shifts.length; i++) {
        const s = shifts[i];
        if (s.startTime - windowStart > 5000 || (i > 0 && s.startTime - prevTime > 1000)) {
          maxWindow = Math.max(maxWindow, windowSum);
          windowStart = s.startTime;
          windowSum = 0;
        }
        windowSum += s.value;
        prevTime = s.startTime;
      }
      cls = Math.max(maxWindow, windowSum);
    }

    let peakHeap = null;
    let memorySource = null;
    try {
      if (typeof performance.measureUserAgentSpecificMemory === 'function') {
        const mem = await performance.measureUserAgentSpecificMemory();
        peakHeap = mem.bytes;
        memorySource = 'measureUserAgentSpecificMemory';
      }
    } catch (e) { /* fall through */ }
    if (peakHeap === null && performance.memory) {
      peakHeap = performance.memory.usedJSHeapSize;
      memorySource = 'performance.memory';
    }

    const resources = performance.getEntriesByType('resource');
    const scripts = resources.filter(r => r.name.includes('.js'));
    const bundleSize = {
      scripts: scripts.map(s => ({
        name: s.name.split('/').pop(),
        transferSize: s.transferSize,
        encodedBodySize: s.encodedBodySize,
        decodedBodySize: s.decodedBodySize,
      })),
      totalTransferSize: scripts.reduce((sum, s) => sum + s.transferSize, 0),
    };

    return {
      ttfb, fcp: fcpTime, lcp: lcpTime, tti, tbt, inp, cls,
      peakHeap, memorySource, serverTiming, bundleSize,
      longTaskCount: longTasks.length,
      layoutShiftCount: shifts.length,
      eventEntryCount: eventEntries.length,
      interactionCount: eventEntries.length > 0
        ? new Set(eventEntries.filter(e => e.interactionId > 0).map(e => e.interactionId)).size
        : 0,
    };
  });

  // CDP heap snapshot
  try {
    const heap = await cdpSession.send('Runtime.getHeapUsage');
    pageMetrics.cdpHeapUsed = heap.usedSize;
    pageMetrics.cdpHeapTotal = heap.totalSize;
  } catch (e) {
    pageMetrics.cdpHeapUsed = null;
    pageMetrics.cdpHeapTotal = null;
  }

  // CDP browser duration breakdown (cumulative seconds since Performance.enable)
  try {
    const { metrics } = await cdpSession.send('Performance.getMetrics');
    const get = name => metrics.find(m => m.name === name)?.value ?? null;
    pageMetrics.scriptDuration = get('ScriptDuration');
    pageMetrics.layoutDuration = get('LayoutDuration');
    pageMetrics.recalcStyleDuration = get('RecalcStyleDuration');
    pageMetrics.taskDuration = get('TaskDuration');
    pageMetrics.layoutCount = get('LayoutCount');
    pageMetrics.recalcStyleCount = get('RecalcStyleCount');
  } catch (e) {
    pageMetrics.scriptDuration = null;
    pageMetrics.layoutDuration = null;
    pageMetrics.recalcStyleDuration = null;
    pageMetrics.taskDuration = null;
    pageMetrics.layoutCount = null;
    pageMetrics.recalcStyleCount = null;
  }

  return pageMetrics;
}
