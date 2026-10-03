<script setup lang="ts">
import { PhArrowsLeftRight, PhCheckCircle, PhSignIn } from "@phosphor-icons/vue";

const { t } = useI18n();

const steps = [
  { key: "redirect", icon: PhSignIn },
  { key: "approve", icon: PhCheckCircle },
  { key: "exchange", icon: PhArrowsLeftRight },
];

// Mirrors the API's AuthorizeQueryParams and AuthorizationCodeGrantRequest.
const authorizeRequest = `GET /api/v1/oauth/authorize
  ?response_type=code
  &client_id=ledgerline-web
  &redirect_uri=https://app.ledgerline.io/callback
  &scope=openid email offline_access
  &state=<random state>
  &code_challenge=<S256 of your verifier>
  &code_challenge_method=S256`;

const tokenRequest = `POST /api/v1/oauth/token
{
  "grant_type": "authorization_code",
  "client_id": "ledgerline-web",
  "client_secret": "<confidential apps only>",
  "code": "<code from the redirect>",
  "redirect_uri": "https://app.ledgerline.io/callback",
  "code_verifier": "<your original verifier>"
}`;
</script>

<template>
  <section id="flow" class="landing-section landing-flow" aria-labelledby="flow-title">
    <div class="landing-flow-copy">
      <h2 id="flow-title" class="landing-heading">{{ t("landing.flow.title") }}</h2>
      <p class="landing-lede">{{ t("landing.flow.description") }}</p>

      <ol class="landing-steps">
        <li v-for="step in steps" :key="step.key">
          <component :is="step.icon" class="landing-step-icon" :size="22" aria-hidden="true" />
          <div>
            <h3>{{ t(`landing.flow.steps.${step.key}.title`) }}</h3>
            <p>{{ t(`landing.flow.steps.${step.key}.description`) }}</p>
          </div>
        </li>
      </ol>
    </div>

    <div class="landing-code">
      <p class="landing-code-label">{{ t("landing.flow.authorizeLabel") }}</p>
      <pre><code>{{ authorizeRequest }}</code></pre>
      <p class="landing-code-label">{{ t("landing.flow.tokenLabel") }}</p>
      <pre><code>{{ tokenRequest }}</code></pre>
    </div>
  </section>
</template>
