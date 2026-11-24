<template>
  <!-- A page that cannot be shown, as one of four cases read off its status (`docs/components.md`, "The error
       page"): one block centred on the screen, its words from its left edge, its actions at the right end of
       their row with the primary last. A person reads the case alone; the error's own message and stack stand
       under a fold in development and nowhere else. -->
  <main class="flex min-h-dvh overflow-y-auto bg-default p-4 sm:p-6" data-error-screen :data-error-kind="kind">
    <div class="m-auto flex w-full max-w-md flex-col gap-6">
      <div class="flex flex-col gap-3">
        <UIcon :name="shown.icon" class="size-10 text-muted" aria-hidden="true" />
        <div class="flex flex-col gap-2">
          <p v-if="status !== undefined" class="text-sm text-muted tabular-nums" data-error-status>{{ status }}</p>
          <h1 class="text-2xl font-semibold text-highlighted break-keep">{{ $t(shown.title) }}</h1>
          <p class="text-base text-muted break-keep">{{ $t(shown.line) }}</p>
        </div>
      </div>

      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          v-if="shown.second === 'back' && canGoBack"
          color="neutral"
          variant="outline"
          icon="i-material-symbols-arrow-back"
          :label="$t('common.action.go_back')"
          class="whitespace-nowrap"
          data-error-action="back"
          @click="goBack"
        />
        <UButton
          v-else-if="shown.second === 'retry'"
          color="neutral"
          variant="outline"
          icon="i-material-symbols-refresh"
          :label="$t('common.action.retry')"
          class="whitespace-nowrap"
          data-error-action="retry"
          @click="retry"
        />
        <UButton
          color="primary"
          icon="i-material-symbols-home-outline"
          :label="$t('common.action.go_home')"
          class="whitespace-nowrap"
          data-error-action="home"
          @click="goHome"
        />
      </div>

      <details v-if="development && (message || stack)" class="font-mono text-sm text-muted" data-error-details>
        <summary class="cursor-pointer break-all">{{ message }}</summary>
        <pre class="mt-2 overflow-x-auto whitespace-pre-wrap break-all">{{ stack }}</pre>
      </details>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { clearError, useHead } from "#imports";

import { ERROR_CASES, errorKind } from "../domain/error-page";

const props = withDefaults(
  defineProps<{
    /** The error's status, where it has one. */
    status?: number;
    /** The path of the app's start the primary action goes to, under the app's base path. */
    home?: string;
    /** The error's own message, drawn in development alone. */
    message?: string;
    /** The error's own stack, drawn in development alone. */
    stack?: string;
  }>(),
  { status: undefined, home: "/", message: undefined, stack: undefined }
);

const { t } = useI18n();
const router = useRouter();
const development = import.meta.dev;
// The browser's own word on whether it is offline, read once the page stands in it and on every change after:
// the server cannot know it, so the first drawing reads the status alone.
const offline = ref(false);
// Whether the browser holds a page of this app to go back to: the router's own record of the entry before.
const canGoBack = ref(false);

const kind = computed(() => errorKind(props.status, offline.value));
const shown = computed(() => ERROR_CASES[kind.value]);

function readConnection(): void {
  offline.value = !navigator.onLine;
}

onMounted(() => {
  readConnection();
  canGoBack.value = typeof (window.history.state as { back?: unknown } | null)?.back === "string";
  window.addEventListener("online", readConnection);
  window.addEventListener("offline", readConnection);
});

onBeforeUnmount(() => {
  window.removeEventListener("online", readConnection);
  window.removeEventListener("offline", readConnection);
});

async function goHome(): Promise<void> {
  await clearError({ redirect: props.home });
}

// The page before, the error left once the router has moved there: the framework keeps an error standing over every
// page until it is cleared.
function goBack(): void {
  const moved = router.afterEach(() => {
    moved();
    void clearError();
  });

  router.back();
}

function retry(): void {
  window.location.reload();
}

useHead({ title: computed(() => t(shown.value.title)) });
</script>
