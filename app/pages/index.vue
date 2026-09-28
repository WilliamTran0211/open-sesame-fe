<script setup lang="ts">
definePageMeta({
  middleware: ["guest"],
});

import lockIcon from "~/assets/icons/lock.svg";
</script>

<template>
  <main class="landing-shell">
    <section class="landing-panel">
      <div class="brand-mark" aria-hidden="true">
        <img :src="lockIcon" alt="" />
      </div>
      <p class="eyebrow">OPEN-SESAME / PLATFORM</p>
      <h1>Secure access for every team.</h1>
      <p class="landing-copy">
        One trusted gateway for identity, approvals, and workspace access across
        your organization.
      </p>

      <div class="landing-actions">
        <NuxtLink to="/login" class="btn btn-primary">Sign in</NuxtLink>
        <NuxtLink to="/dashboard" class="btn btn-outline"
          >View dashboard</NuxtLink
        >
      </div>
    </section>
  </main>
</template>
