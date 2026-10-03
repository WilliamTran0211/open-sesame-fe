<!-- Frame for sign-in, sign-up, verification, consent and other signed-out pages. -->
<template>
  <main class="login-page">
    <ThemeToggle class="auth-theme-toggle" />
    <slot />
    <AuthFooter />
  </main>
</template>
