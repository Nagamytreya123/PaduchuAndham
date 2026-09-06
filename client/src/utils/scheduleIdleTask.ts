/** Run work after first paint; falls back to setTimeout when idle callback is unavailable. */
export function scheduleIdleTask(task: () => void, timeoutMs = 2000): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout: timeoutMs });
    return;
  }
  setTimeout(task, 1);
}
