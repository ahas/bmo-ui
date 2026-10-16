import { describe, expect, test } from 'bun:test';
import { effectScope, ref } from 'vue';
import { markPainted, useInitialRead, usePainted } from '~/domain/loading';

describe('initial data loading', () => {
  test('SSR idle and hydration pending produce the same state', () => {
    const scope = effectScope();
    scope.run(() => {
      const status = ref('idle');
      const initial = useInitialRead(status);
      expect(initial.value).toBe(true);
      status.value = 'pending';
      expect(initial.value).toBe(true);
      status.value = 'success';
      expect(initial.value).toBe(false);
      // Success includes empty arrays and null: neither is an unqueried result.
      status.value = 'pending';
      expect(initial.value).toBe(false);
      status.value = 'error';
      expect(initial.value).toBe(false);
    });
    scope.stop();
  });
  test('initial failures end the skeleton and retries re-enter it', () => {
    const scope = effectScope();
    scope.run(() => {
      const status = ref('pending');
      const initial = useInitialRead(status);
      status.value = 'error';
      expect(initial.value).toBe(false);
      status.value = 'pending';
      expect(initial.value).toBe(true);
      status.value = 'success';
      status.value = 'pending';
      expect(initial.value).toBe(false);
    });
    scope.stop();
  });
  test('nothing is painted as asked for until the browser has taken the page over', () => {
    const painted = usePainted();
    expect(painted.value).toBe(false);
    markPainted();
    expect(painted.value).toBe(true);
  });
  test('cache hits display immediately without a timer', () => {
    const scope = effectScope();
    scope.run(() => expect(useInitialRead(ref('success')).value).toBe(false));
    scope.stop();
  });
});
