import { computed, readonly, ref, shallowRef, watch, type Ref } from "vue";

// A successful empty response is content. Refreshing it must not restart the initial skeleton.
export function useInitialRead(status: Ref<string>) {
  const loaded = ref(status.value === "success");
  watch(status, value => { if (value === "success") loaded.value = true; }, { flush: "sync" });
  return computed(() => !loaded.value && status.value !== "error");
}

// What a read last brought. A failed read puts the fetch's data back to its default, and a screen
// that already showed what it read keeps it through the failure rather than going blank.
export function useLastRead<T>(data: Ref<T>, status: Ref<string>): Readonly<Ref<T>> {
  const kept = shallowRef<T>(data.value);
  watch([data, status], () => { if (status.value !== "error") kept.value = data.value; });
  return computed(() => kept.value);
}

// Whether the browser has taken the page over. The skeletons stand for reads the browser makes, so
// the picture the server draws, and the browser's hydration of it, stand before anything has been
// asked for: a skeleton there would say a read is going that has not begun. The server never sets
// this, and the client sets it once, as hydration ends and the reads start (the painted plugin).
const painted = ref(false);

export function markPainted(): void {
  painted.value = true;
}

export function usePainted(): Readonly<Ref<boolean>> {
  return readonly(painted);
}
