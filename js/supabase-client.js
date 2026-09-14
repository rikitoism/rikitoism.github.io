(function () {
  const config = window.SOUL_SUPABASE_CONFIG;

  window.soulSupabase = {
    configured: Boolean(
      config &&
      config.url &&
      config.anonKey &&
      !config.url.includes('YOUR-PROJECT') &&
      !config.anonKey.includes('YOUR-ANON-KEY')
    ),
    client: null
  };

  if (window.soulSupabase.configured && window.supabase) {
    window.soulSupabase.client = window.supabase.createClient(config.url, config.anonKey);
  }
})();
