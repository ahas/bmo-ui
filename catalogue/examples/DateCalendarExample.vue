<template>
  <UPopover>
    <UButton color="neutral" variant="outline" icon="i-material-symbols-calendar-today-outline" :label="day?.toString() ?? t('notes.placeholder.day')" />

    <template #content>
      <DateCalendar v-model="day" class="p-2" />
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import { useI18n } from "vue-i18n";

import type { CalendarDate } from "@internationalized/date";

const { t } = useI18n();
const day = shallowRef<CalendarDate>();
</script>
