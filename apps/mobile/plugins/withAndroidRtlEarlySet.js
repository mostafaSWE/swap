// Expo config plugin (D-7) — inject a native early-set of the RTL layout
// direction into Android `MainApplication.onCreate`, BEFORE React loads, so the
// very first frame is never a mismatched direction. The rule mirrors the JS
// locale rule (src/i18n/index.ts): an Arabic device ⇒ RTL, any other language
// ⇒ LTR. Because the native flag is read when the first surface is created
// (just after this), `forceRTL` applies with NO reload — which is what makes the
// direction invariant hold in a bare production release (Updates.reloadAsync()
// is unavailable there; see D-7).
//
// This is the production / prebuild source of truth. On this dev machine the
// same change is also applied directly to the CNG-generated MainApplication.kt
// (android/ is git-ignored); a `prebuild` re-injects it from here. Android-only:
// iOS is aligned by app.json → ios.infoPlist.CFBundleLocalizations (base "en").
// Import via `expo/config-plugins` (re-export) rather than `@expo/config-plugins`
// directly: `expo` is a direct dependency, so this resolves under pnpm's isolated
// linker, whereas the scoped package would be a phantom dependency.
const { withMainApplication } = require("expo/config-plugins");

const IMPORT = "import com.facebook.react.modules.i18nmanager.I18nUtil";
const ANCHOR_IMPORT = "import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint";
const MARKER = "rtl-early-set (D-7)";
const LOAD = "    loadReactNative(this)";
const BLOCK = `    // ${MARKER}: reconcile the native layout direction to the active
    // locale BEFORE React loads, so the very first frame is never a mismatched
    // direction. Mirrors the JS locale rule (src/i18n/index.ts): Arabic ⇒ RTL,
    // any other language ⇒ LTR. Applies without a reload (the flag is read when
    // the first surface is created, just after this).
    I18nUtil.instance.apply {
      allowRTL(applicationContext, true)
      forceRTL(applicationContext, resources.configuration.locales.get(0)?.language == "ar")
    }
${LOAD}`;

module.exports = function withAndroidRtlEarlySet(config) {
  return withMainApplication(config, (cfg) => {
    if (cfg.modResults.language !== "kt") {
      throw new Error("[withAndroidRtlEarlySet] expected a Kotlin MainApplication");
    }
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg; // already injected — idempotent

    if (!src.includes(IMPORT)) {
      src = src.includes(ANCHOR_IMPORT)
        ? src.replace(ANCHOR_IMPORT, `${ANCHOR_IMPORT}\n${IMPORT}`)
        : src.replace(/(package .+\n)/, `$1\n${IMPORT}\n`);
    }
    if (!src.includes(LOAD)) {
      throw new Error("[withAndroidRtlEarlySet] could not find loadReactNative(this) anchor");
    }
    src = src.replace(LOAD, BLOCK);

    cfg.modResults.contents = src;
    return cfg;
  });
};
