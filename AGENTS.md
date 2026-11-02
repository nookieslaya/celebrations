# Zasady projektu

Pracujemy na istniejącym WordPressie LocalWP. Nie instaluj WP, nie resetuj bazy, nie zmieniaj aktywnego motywu bez oceny istniejącej pracy. Nie konfiguruj kontenerów ani usług zastępujących LocalWP.

Kod aplikacji: `wp-content/plugins/microsite-core/app`. Routing `/app/*` i assety należą do wtyczki. Motyw jest opcjonalny. Zachowuj jeden origin dla dokumentów i API. Vite służy tylko do assetów/HMR.

Komendy WP/PHP wykonuj w LocalWP → Open site shell. Nie zapisuj bezwzględnych ścieżek lokalnych narzędzi w kodzie. Node >=22.12.0. Instalacja zależności: `npm ci`. Główna kontrola: `npm run verify` w katalogu app. Testy przeglądarkowe: `WP_SITE_URL="$(wp option get home)" npm run test:e2e`.

Jedyną listą zadań jest `specs/001-app-shell/tasks.md`. Stan weryfikacji zapisuj w docs/STATUS.md. Nie raportuj pominiętych kontroli jako PASS.

Żadne przyszłe testy kasujące dane nie mogą używać bazy tej strony. Wymagaj osobnej bazy testowej i jawnego bezpiecznika przed migracją/resetem. Nie commituj WordPress core, wp-config.php, uploadów, sekretów, node_modules, vendor ani dist. Nie implementuj kont/projektów/płatności/zaproszeń w etapie 1.

## Czytelność kodu

Pisz pełny, zrozumiały kod. Stosuj konsekwentne wcięcia, opisowe nazwy oraz osobne linie dla instrukcji i elementów HTML/JSX. Nie minifikuj ręcznie kodu źródłowego ani konfiguracji. Warunki kończące wykonanie zapisuj jako jawne bloki `if`, zamiast skrótów typu `defined(...) || exit`. Oddzielaj logiczne części pustymi liniami. Skracanie zapisu nie jest celem; kod ma być łatwy do czytania i rozwijania.

## Backend od etapu 2

`npm run contracts:generate` generuje TS ze schematów JSON, a `npm run verify` sprawdza aktualność wyniku, lint, typy i build. `npm run test:integration` uruchamia rzeczywiste testy HTTP na jednej stałej, izolowanej bazie testowej; szczegóły i bezpieczniki są w docs/TESTING.md. Nie zastępuj testów właściciela lub sesji mockami. Nie dodawaj fixture nonce do działającej strony. Działającego Vite nie uruchamiaj ponownie i nie zatrzymuj bez potrzeby. Drobne zmiany zostawiaj lokalnie; commit/push wykonuj po większych etapach lub na wyraźne polecenie, nie po każdej poprawce.

## Konta i panel od etapu 3

Bootstrap sesji i nonce generuje WordPress w prywatnym dokumencie /app/*. Operacje kont wymagają osobnego kontekstu CSRF i sprawdzenia Origin; nie zastępuj go anonimowym WP nonce. Nie włączaj automatycznie users_can_register. Nie dodawaj tokenów do localStorage ani statycznych assetów. Pełne E2E kont/projektów uruchamia npm run test:integration na tej samej dedykowanej bazie testowej; npm run test:e2e na stronie LocalWP ma pozostać anonimowy i bez tworzenia danych. Nowy typ ma własne Fields/Preview w rejestrze edytorów, bez kopiowania kont, odczytu i zapisu. Przed publicznym startem wymagane są reset hasła i weryfikacja emaila.

## Ponowne używanie środowiska testowego

Nie twórz nowej bazy przy każdym przebiegu. Używaj stałej bazy microsite_test_<identyfikator-projektu>, tworzonej tylko raz. Runner przełącza połączenie we własnej tymczasowej konfiguracji, nie zmienia wp-config.php strony LocalWP. Przed czyszczeniem wyłącznie tabel ms_test_* sprawdza różną DB_NAME, marker własności projektu i blokadę równoległych testów. Nie usuwaj bazy po testach. Nie przejmuj istniejącej bazy bez markera.

## Renderer i podgląd od etapu 4

Schemat birthday-invitation jest źródłem limitów/defaults/typów; reguły DST wykonuje EventDate przez zaufany normalizer w Catalog. Nie wyliczaj momentu przez domyślną strefę przeglądarki/serwera. Renderer nie importuje routera, API ani kont; mapowanie wersji i lazy loading jest w renderers/registry.ts. Preview używa zapisanych, zwalidowanych danych i kontroli właściciela, nigdy przyszłej publicznej trasy /s/. GSAP musi mieć cleanup i reduced motion. TEST_SCOPE=birthday jest węższym testem na tej samej bazie, nie pełną regresją. Artefakty birthday w test-results/birthday mają pozostać dostępne po smoke tests; nie commituj PNG ani builda. PHPCS/CI pozostają długiem, nie konfiguruj ich bez zmiany zakresu.


## Zakres sprawdzania

Użytkownik preferuje podstawowe sprawdzanie. Przy zwykłych poprawkach ogranicz się do lint/typów/builda odpowiedniego dla zmiany. Nie uruchamiaj rozbudowanej regresji, macierzy widoków ani wielokrotnych przeglądów wizualnych bez wyraźnej potrzeby lub aktualnej prośby. Nie powtarzaj poprawnych kontroli bez nowej zmiany lub konkretnego błędu. Respektuj bieżące ograniczenie zakresu testów także wtedy, gdy starszy opis etapu zawiera szeroką checklistę.
