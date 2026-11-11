// A countdown in seconds, e.g. before a "Resend code" link works again.
// The timer stops by itself at zero and when the component unmounts.
export function useCooldown(seconds: number) {
  const remaining = ref(0);
  let timer: number | undefined;

  function stop() {
    window.clearInterval(timer);
    timer = undefined;
  }

  // `duration` overrides the default, e.g. with a Retry-After from the API.
  function start(duration = seconds) {
    stop();
    remaining.value = duration;
    timer = window.setInterval(() => {
      remaining.value -= 1;

      if (remaining.value <= 0) {
        stop();
      }
    }, 1000);
  }

  onBeforeUnmount(stop);

  return { remaining, active: computed(() => remaining.value > 0), start, stop };
}
