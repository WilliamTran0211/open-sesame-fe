<script setup lang="ts">
const { t } = useI18n();
const year = new Date().getFullYear();
</script>

<template>
  <footer class="login-footer">
    <span>{{ t("brand.copyright", { year }) }}</span>
  </footer>
</template>
