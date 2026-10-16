<template>
  <span :class="fill ? 'relative block size-full' : 'relative inline-block max-w-full align-middle'" :aria-busy="!ready && !broken">
    <SkeletonStatus v-if="!ready && !broken && !standIn" class="absolute inset-0 flex min-h-20 min-w-20" :label="$t('common.status.picture_loading')"><SkeletonBar class="size-full" :class="fill ? '' : 'rounded-lg'" /></SkeletonStatus>
    <img v-if="!ready && !broken && standIn" data-stand-in :src="standIn" alt="" class="absolute inset-0 size-full object-cover" :class="fill ? '' : 'rounded-lg'">
    <img v-if="!broken" ref="picture" :key="src" :src="src" :alt="alt" :loading="eager ? 'eager' : 'lazy'" :class="[imageClass, !ready && aspect === undefined ? 'min-h-20 min-w-20 opacity-0' : !ready ? 'opacity-0' : '']" :style="aspect === undefined ? undefined : { aspectRatio: aspect }" @load="onLoad" @error="broken = true">
    <span v-else role="alert" class="text-sm text-dimmed">{{ $t("common.error.picture_failed") }}</span>
  </span>
</template>
<script setup lang="ts">
// `fill` stands the picture the whole width of what holds it, running to that box's edges.
// `shape` is the picture's known shape, which keeps its room before it has loaded; `loaded` says the
// shape it turned out to have. `standIn` is a picture already drawn for this one — a preview the page
// already holds — standing where it will until it has loaded and been decoded, so it takes its
// place in one frame rather than over a blank.
const props = defineProps<{ src: string; alt: string; imageClass?: string; eager?: boolean; fill?: boolean; shape?: { width: number; height: number } | null; standIn?: string | null }>();
const emit = defineEmits<{ loaded: [shape: { width: number; height: number }] }>();
const aspect = computed(() => (props.shape ? `${props.shape.width} / ${props.shape.height}` : undefined));

async function onLoad(): Promise<void> {
  const loaded = picture.value;

  if (loaded !== null && props.standIn) {
    await loaded.decode().catch(() => undefined);
  }

  ready.value = true;

  if (loaded !== null) {
    emit("loaded", { width: loaded.naturalWidth, height: loaded.naturalHeight });
  }
}
const ready = ref(false), broken = ref(false), picture = ref<HTMLImageElement | null>(null);
watch(() => props.src, () => { ready.value = false; broken.value = false; });
onMounted(() => { if (picture.value?.complete && picture.value.naturalWidth > 0) void onLoad(); });
</script>
