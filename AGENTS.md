# Zasady projektu

Pracujemy na istniejącym WordPressie LocalWP. Nie instaluj WP, nie resetuj bazy, nie zmieniaj aktywnego motywu bez oceny istniejącej pracy. Nie konfiguruj kontenerów ani usług zastępujących LocalWP.

Kod aplikacji: `wp-content/plugins/microsite-core/app`. Routing `/app/*` i assety należą do wtyczki. Motyw jest opcjonalny. Zachowuj jeden origin dla dokumentów i API. Vite służy tylko do assetów/HMR.

Komendy WP/PHP wykonuj w LocalWP → Open site shell. Nie zapisuj bezwzględnych ścieżek lokalnych narzędzi w kodzie. Node >=22.12.0. Instalacja zależności: `npm ci`. Główna kontrola: `npm run verify` w katalogu app. Testy przeglądarkowe: `WP_SITE_URL="$(wp option get home)" npm run test:e2e`.

Jedyną listą zadań jest `specs/001-app-shell/tasks.md`. Stan weryfikacji zapisuj w docs/STATUS.md. Nie raportuj pominiętych kontroli jako PASS.

Żadne przyszłe testy kasujące dane nie mogą używać bazy tej strony. Wymagaj osobnej bazy testowej i jawnego bezpiecznika przed migracją/resetem. Nie commituj WordPress core, wp-config.php, uploadów, sekretów, node_modules, vendor ani dist. Nie implementuj kont/projektów/płatności/zaproszeń w etapie 1.

## Czytelność kodu

Pisz pełny, zrozumiały kod. Stosuj konsekwentne wcięcia, opisowe nazwy oraz osobne linie dla instrukcji i elementów HTML/JSX. Nie minifikuj ręcznie kodu źródłowego ani konfiguracji. Warunki kończące wykonanie zapisuj jako jawne bloki `if`, zamiast skrótów typu `defined(...) || exit`. Oddzielaj logiczne części pustymi liniami. Skracanie zapisu nie jest celem; kod ma być łatwy do czytania i rozwijania.
