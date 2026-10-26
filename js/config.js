/* OtokuMap — local configuration
   ------------------------------------------------------------------
   Google Maps API key.

   Free option (no credit card):
     https://mapsplatform.google.com/maps-demo-key/

   Before publishing this project, restrict the key in Google Cloud
   Console → APIs & Services → Credentials:
     • Application restrictions → Websites
         http://localhost:8000/*
         http://127.0.0.1:8000/*
         https://your-domain.example/*
     • API restrictions → Maps JavaScript API + Places API (New)

   A browser key is always visible to visitors. Restrictions and
   quotas are what keep it safe. See README.md for details.
   ------------------------------------------------------------------ */
window.OTOKU_CONFIG = {
  googleMapsApiKey: 'AIzaSyAn6T2gveTF3-GIaeNp0glCx8kqk9Q8_-w',

  /* Advanced Markers need a Map ID. DEMO_MAP_ID is fine for development.
     Create your own Map ID in Google Cloud for production styling. */
  mapId: 'DEMO_MAP_ID',

  /* Places (New) nearby search */
  placesRegion: 'JP',
  placesMaxResults: 20,
  placeTypes: ['supermarket'],

  /* 'auto' follows the site language (EN / 日本語) */
  mapLanguage: 'auto'
};
