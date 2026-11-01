# Architektura

## Działający fundament

WordPress LocalWP obsługuje dokument panelu i REST API pod jednym originem. Wtyczka `microsite-core` odpowiada za routing `/app/*`; motyw nie zawiera logiki aplikacji. Vite służy do assetów/HMR. Produkcja odczytuje manifest. Dotychczasowy bootstrap dokumentu zawiera `appUrl`, `restUrl` i tryb assetów; nie zawiera sesji ani nonce.

## Warstwy backendu

- `Catalog` — jawne tablice aktywnych typów i szablonów. Identyfikatory wejściowe tylko wybierają pozycję rejestru, nigdy plik/klasę/funkcję.
- `SiteType` — prywatny CPT `ms_site`, bez publicznych URL, archiwum, wyszukiwania, interfejsu wp-admin i domyślnego REST.
- `Permissions` — rola `microsite_customer`, wymaganie sesji i capabilities oraz sprawdzanie właściciela.
- `SiteValidator` — dozwolone pola, kontrakt danych, treści tekstowe, wybór i zgodność wersji.
- `SiteRepository` — WordPress persistence i jawny DTO zamiast surowego WP_Post.
- `SiteService` — przypadki tworzenia, odczytu, edycji i listowania.
- `SitesController` — transport HTTP, JSON, statusy i rejestracja tras; nie zawiera logiki zapisu.

## Model szkicu

`post_author` jest właścicielem, `post_title` nazwą projektu, `post_status` zawsze `draft`. ID i daty pochodzą z WordPressa; data GMT jest jawnie ustawiana przy tworzeniu szkicu. Losowy publicId ma 128 bitów entropii (`random_bytes`), jest generowany przez serwer i sprawdzany pod kątem kolizji; trafia też do `post_name`. Nie jest uprawnieniem ani działającym adresem publikacji. Współbieżny zapis tego samego szkicu na razie działa według zasady ostatniego poprawnego zapisu; wersjonowanie konfliktów edycji nie jest zaimplementowane.

Prywatne meta `_microsite_data` zawiera systemowe `publicId`, `siteType`, `templateId`, `templateVersion`, `schemaVersion` i osobny klucz `draft` z konfiguracją klienta. API tworzy DTO z jawnej listy pól. Właściciel i pozostałe meta nie są ujawniane. Nie zapisujemy pustego published snapshot. Przyszła publikacja otrzyma osobny, niezmienny snapshot (np. `_microsite_published_snapshot`) oraz własną operację autoryzowaną — obecne CRUD nigdy go nie zapisuje.

## Kontrakt konfiguracji

Jedynym źródłem struktury, wymaganych pól, limitów, enumów i wartości domyślnych jest `contracts/basic-page.v1.json` (podzbiór JSON Schema obsługiwany przez WordPress REST). PHP ładuje ten schemat i używa `rest_validate_value_from_schema`; nie wymaga to Composera ani utrzymywania drugiego walidatora. Domyślne wartości są wyprowadzane ze schematu. Generator Node produkuje `app/src/generated/drafts.ts`; `npm run contracts:check`, włączone do `verify`, wykrywa nieaktualny plik. Generator jawnie obsługuje obecnie object/string/enum; rozszerzenie schematu o nowy typ wymaga rozszerzenia generatora i testów.

Walidacja odrzuca nieznane właściwości na każdym poziomie, błędne typy, wersje klienta, niezgodny szablon i tekst przekraczający limity. Osobna polityka plain text odrzuca znaczniki HTML, zakodowane znaczniki i niedozwolone znaki sterujące. Tekst nie jest interpretowany jako kod. Dane z API należy renderować przez JSX lub `esc_html`, nigdy jako HTML. Późniejszy renderer musi mapować klucz renderera z zaufanego rejestru; nie jest jeszcze wdrożony.

Przy tworzeniu klient wskazuje zarejestrowane siteType i templateId, a serwer ustala ich bieżące wersje. Brak draft oznacza pełne defaults. Przesłany draft musi być kompletny. PATCH może zmienić name i/lub zastąpić cały draft; nie ma merge ani zmiany typu/wersji. Niezgodna zapisana wersja blokuje edycję 409 do czasu przyszłej jawnej migracji.

## Autoryzacja i transport

Klient ma `read`, `create_ms_sites`, `edit_ms_sites`. Administrator dostaje dodatkowo `manage_ms_sites`, `edit_others_ms_sites`, `read_private_ms_sites`. Nie nadajemy publikowania, usuwania, uploadów ani ogólnych uprawnień edycji wpisów. Konfiguracja ról jest wersjonowana i sprawdzana na init, więc działa przy aktualizacji już aktywnej wtyczki. Inne role pozostają bez zmian.

Sesje cookies i `X-WP-Nonce` są obsługiwane przez WordPress. Brak nonce powoduje traktowanie żądania cookies jako anonimowego; błędny nonce daje core'owy 403. Niezależnie wymagamy capability oraz własności; obsługa cudzego szkicu przez administratora wymaga dodatkowych uprawnień. Dla zalogowanego użytkownika cudzy, niedostępny i nieistniejący projekt zwracają taki sam 404. Lista zawsze zawiera wyłącznie własne szkice, również dla administratora. Odpowiedzi API mają no-store/private, także błędy. [Mechanizm cookies i nonce WordPressa](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/) oraz [walidacja schematów](https://developer.wordpress.org/rest-api/extending-the-rest-api/schema/) stanowią podstawę integracji.

Typowany klient API przyjmuje restUrl i funkcję getNonce. Nie pobiera publicznego nonce, nie loguje użytkownika, nie zapisuje tokenów i nie ponawia zapisów. Bootstrap sesji oraz odnowienie nonce pozostają zadaniem etapu 3. Panel etapu 1 pozostaje bez integracji CRUD.

## Testy i przyszłe moduły

Testy HTTP uruchamiają prawdziwy WordPress z kopii istniejącego core, osobną nową bazą i tymczasowym serwerem PHP. Nie używają mocków autoryzacji. Fixtures kont/nonce istnieją tylko w tej instalacji testowej. Bezpiecznik porównuje DB_NAME z konfiguracją strony przed utworzeniem/instalacją/usunięciem bazy, dopuszcza wyłącznie nowe nazwy microsite_test_* i sprawdza marker własności. Nie używamy istniejących baz testowych. Vite i serwer LocalWP pozostają uruchomione.

RSVP, płatności, publikacja i uploady nie istnieją w etapie 2. Przyszłe zmiany danych otrzymają osobne wersjonowane migracje i testy na izolowanej bazie; nie będą wykonywane przez payload szkicu.
