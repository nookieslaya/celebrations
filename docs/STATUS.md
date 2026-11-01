# Stan faktyczny — 2026-11-01

Etap 2 zakończony. Backend 0.2.0 jest aktywny na istniejącej stronie LocalWP. Panel pozostaje pod http://celebrations.local/app/ i http://celebrations.local/app/sites. Istniejący Vite nadal działa; nie uruchomiono drugiej instancji ani nie zatrzymano go. Produkcyjny build jest aktualny. Końcowy odczyt konfiguracji wskazuje aktywny motyw microsite-shell. Podczas tego etapu nie przełączano motywu; istniejące treści pozostały bez zmian.

## Co działa

Prywatny CPT ms_site, rola microsite_customer z minimalnymi capabilities oraz idempotentna konfiguracja uprawnień administratora. Rejestr basic-page/basic. Kontrakt JSON Schema, backendowa walidacja i generowane typy TS z kontrolą aktualności. Repozytorium i serwis szkiców, właściciel z sesji, backendowe publicId i wersje, pełne zastępowanie draft bez merge. Publiczny katalog i chronione API list/create/read/patch z paginacją, izolacją właścicieli, cookies/REST nonce i no-store. Typowany klient API przygotowany do modułu sesji etapu 3; panel nadal nie loguje użytkownika ani nie edytuje projektów.

## Wykonane kontrole

- Testy integracyjne HTTP na prawdziwym WordPressie 7.1.4, PHP 8.4.27 i osobnej nowej bazie MySQL LocalWP: 17 grup kontroli PASS. Produkcyjny shell i assety bez zależności od Vite, publiczny katalog, anonimowy dostęp, rzeczywiste cookies i brak/błędny nonce POST/PATCH, defaults, właściciel sesji, publicId, izolacja A/B, capabilities, administrator, pola systemowe, walidacja bez zmian po błędzie, konflikty wersji, paginacja, ukrycie CPT i idempotentne role. Bez ostrzeżeń PHP w logu testowym.
- Końcowa kontrola wykazała 0 pozostałych baz microsite_test_*. Runner tworzył wyłącznie nowe bazy microsite_test_* i tymczasową instalację; sprzątanie po udanych i nieudanych przebiegach wykonane. Nie instalowano WordPressa ani fixture kont/projektów w bazie strony LocalWP.
- Próba guard-only z DB_NAME strony: PASS, odmowa przed operacją na bazie.
- Celowo zmieniony wygenerowany plik TS: PASS, contracts:check wykrył nieaktualny wynik; plik przywrócono.
- php -l dla wszystkich 14 własnych plików PHP: PASS.
- npm run verify (kontrakty, ESLint, TypeScript, build): PASS.
- Dotychczasowe E2E z TEST_HMR=1 na działającym LocalWP/Vite: 4 PASS (obie trasy i refresh, nawigacja, HMR ze stanem bez reloadu).

Przy przygotowaniu testów poprawiono wykrywanie socketu MySQL, wyłączono Local auto_prepend wyłącznie w testowym procesie PHP i skorygowano oczekiwanie dla domyślnego endpointu metadanych CPT: WordPress odmawia 401 rest_cannot_read_type. Końcowy zestaw przeszedł w całości.

## Ograniczenia i pominięte kontrole

Nie skonfigurowano PHPCS ani GitHub Actions; nie raportujemy ich jako PASS. Nie wdrożono rendererów, podglądu, customowych kont, kreatora, animacji, publikacji, płatności, mediów, QR i RSVP. Bootstrap sesji/nonce w panelu jest jawną zależnością etapu 3, nie blokadą backendu — autoryzację sprawdzono rzeczywistymi sesjami testowymi.

Jednoczesna edycja stosuje ostatni poprawny zapis; brak wykrywania konfliktów edycji. Zmiana wersji schematu/szablonu wymaga przyszłej jawnej migracji. Minimum PHP 8.2/WP 6.6 jest deklaracją; sprawdzono wersje LocalWP. HTTPS development i pełna macierz przeglądarek nie były testowane.

Znane z etapu 1: npm audit zgłasza 10 moderate w drzewie ESLint/typescript-eslint (minimatch). Zależności nie zmieniły się w tym etapie. Nie wykonywano audit fix --force. Spec Kit nie jest zainstalowany (brak uv/specify); używamy Markdown i jednej listy zadań specs/001-app-shell/tasks.md. Wbudowany Browser nie połączył się w poprzednim etapie; kontrolę wykonano przez lokalny Playwright.

## Następny etap

Etap 3: customowe konta WordPress, bezpieczny bootstrap i odnowienie sesji/nonce, lista własnych projektów i prosty edytor szkicu React. Backend, kontrakty i klient API są przygotowane. Zmiany etapu 2 pozostają lokalne; nie wykonano automatycznego commita ani push.
