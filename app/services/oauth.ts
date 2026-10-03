// /oauth endpoints the consent screen calls. The authorize and token endpoints are
// used by client apps directly, not by this front end.
import { apiFetch } from "~/utils/api";
import type { AuthorizeRequest } from "~/utils/oauth";

export const oauthApi = {
  // Records that the signed-in user approved this request and issues the code.
  // The API validates everything again and answers with where to send the browser.
  consent: (request: AuthorizeRequest) =>
    apiFetch<{ redirect_to: string }>("/oauth/consent", {
      method: "POST",
      body: {
        client_id: request.clientId,
        redirect_uri: request.redirectUri,
        scope: request.scope,
        state: request.state,
        code_challenge: request.codeChallenge,
        code_challenge_method: request.codeChallengeMethod,
      },
    }),
};
