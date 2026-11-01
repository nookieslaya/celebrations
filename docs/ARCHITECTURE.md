# Architektura

## Działający fundament

WordPress LocalWP obsługuje dokument panelu i REST API pod jednym originem. Wtyczka `microsite-core` odpowiada za routing `/app/*`; motyw nie zawiera logiki aplikacji. Vite służy do assetów/HMR. Produkcja odczytuje manifest. Bootstrap dokumentu zawiera appUrl, restUrl, tryb assetów, sesję rozpoznaną przez WordPress, REST nonce zalogowanego użytkownika i authCsrfToken dla operacji kont. Dane są generowane przy żądaniu, nigdy w statycznym buildzie.

## Warstwy backendu

- `Catalog` — jawne tablice aktywnych typów i szablonów. Identyfikatory wejściowe tylko wybierają pozycję rejestru, nigdy plik/klasę/funkcję.
- `SiteType` — prywatny CPT `ms_site`, bez publicznych URL, archiwum, wyszukiwania, interfejsu wp-admin i domyślnego REST.
- `Permissions` — rola `microsite_customer`, wymaganie sesji i capabilities oraz sprawdzanie właściciela.
- `SiteValidator` — dozwolone pola, kontrakt danych, treści tekstowe, wybór i zgodność wersji.
- `SiteRepository` — WordPress persistence i jawny DTO zamiast surowego WP_Post.
- `SiteService` — przypadki tworzenia, odczytu, edycji i listowania.
- `SitesController` — transport HTTP, JSON, statusy i rejestracja tras; nie zawiera logiki zapisu.

## Model szkicu

`post_author` jest właścicielem, `post_title` nazwą projektu, `post_status` zawsze `draft`. ID i daty pochodzą z WordPressa; data GMT jest jawnie ustawiana przy tworzeniu szkicu. Losowy publicId ma 128 bitów entropii (`random_bytes`), jest generowany przez serwer i sprawdzany pod kątem kolizji; trafia też do `post_name`. Nie jest uprawnieniem; od etapu 5 wskazuje stabilny adres publikacji. Współbieżny zapis tego samego szkicu na razie działa według zasady ostatniego poprawnego zapisu; wersjonowanie konfliktów edycji nie jest zaimplementowane.

Prywatne meta `_microsite_data` zawiera systemowe `publicId`, `siteType`, `templateId`, `templateVersion`, `schemaVersion` i osobny klucz `draft` z konfiguracją klienta. API tworzy DTO z jawnej listy pól. Właściciel i pozostałe meta nie są ujawniane. Od etapu 5 `_microsite_publication` zawiera niezależny snapshot, stan i datę publikacji w jednym wpisie. CRUD szkicu nigdy go nie zapisuje.

## Kontrakt konfiguracji

Jedynym źródłem struktury, wymaganych pól, limitów, enumów i wartości domyślnych jest `contracts/basic-page.v1.json` (podzbiór JSON Schema obsługiwany przez WordPress REST). PHP ładuje ten schemat i używa `rest_validate_value_from_schema`; nie wymaga to Composera ani utrzymywania drugiego walidatora. Domyślne wartości są wyprowadzane ze schematu. Generator Node produkuje `app/src/generated/drafts.ts`; `npm run contracts:check`, włączone do `verify`, wykrywa nieaktualny plik. Generator jawnie obsługuje obecnie object/string/enum; rozszerzenie schematu o nowy typ wymaga rozszerzenia generatora i testów.

Walidacja odrzuca nieznane właściwości na każdym poziomie, błędne typy, wersje klienta, niezgodny szablon i tekst przekraczający limity. Osobna polityka plain text odrzuca znaczniki HTML, zakodowane znaczniki i niedozwolone znaki sterujące. Tekst nie jest interpretowany jako kod. Dane z API należy renderować przez JSX lub `esc_html`, nigdy jako HTML. Wspólny renderer wybiera zaufany rejestr wersji; dokument publiczny korzysta wyłącznie ze snapshotu.

Przy tworzeniu klient wskazuje zarejestrowane siteType i templateId, a serwer ustala ich bieżące wersje. Brak draft oznacza pełne defaults. Przesłany draft musi być kompletny. PATCH może zmienić name i/lub zastąpić cały draft; nie ma merge ani zmiany typu/wersji. Niezgodna zapisana wersja blokuje edycję 409 do czasu przyszłej jawnej migracji.

## Autoryzacja i transport

Klient ma `read`, `create_ms_sites`, `edit_ms_sites`. Administrator dostaje dodatkowo `manage_ms_sites`, `edit_others_ms_sites`, `read_private_ms_sites`. Od etapu 5 capability publish_ms_sites umożliwia wywołanie publikacji, ale wymaga dodatkowo osobnego prawa każdego projektu, domyślnie wyłączonego. Nie nadajemy usuwania, uploadów ani ogólnych uprawnień edycji wpisów. Konfiguracja ról jest wersjonowana i sprawdzana na init, więc działa przy aktualizacji już aktywnej wtyczki. Inne role pozostają bez zmian.

Sesje cookies i `X-WP-Nonce` są obsługiwane przez WordPress. Brak nonce powoduje traktowanie żądania cookies jako anonimowego; błędny nonce daje core'owy 403. Niezależnie wymagamy capability oraz własności; obsługa cudzego szkicu przez administratora wymaga dodatkowych uprawnień. Dla zalogowanego użytkownika cudzy, niedostępny i nieistniejący projekt zwracają taki sam 404. Lista zawsze zawiera wyłącznie własne szkice, również dla administratora. Odpowiedzi API mają no-store/private, także błędy. [Mechanizm cookies i nonce WordPressa](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/) oraz [walidacja schematów](https://developer.wordpress.org/rest-api/extending-the-rest-api/schema/) stanowią podstawę integracji.

Typowany klient API przyjmuje restUrl i funkcję getNonce. Nie pobiera publicznego nonce, nie loguje użytkownika, nie zapisuje tokenów i nie ponawia zapisów. Etap 3 wdraża bootstrap sesji, odczyt GET /session i dynamiczne odświeżanie nonce z nagłówków odpowiedzi WordPressa. Panel korzysta z istniejącego CRUD bez zmian jego semantyki.

## Testy i przyszłe moduły

Testy HTTP uruchamiają prawdziwy WordPress z kopii istniejącego core, jedną stałą osobną bazą i tymczasowym serwerem PHP. Nazwa microsite_test_<hash-katalogu-projektu> jest stabilna. Baza powstaje raz i nie jest usuwana po testach. Przed następnym przebiegiem runner czyści wyłącznie jej tabele ms_test_*, sprawdzając DB_NAME różną od strony LocalWP, trwały marker własności poza repozytorium i blokadę równoległych uruchomień. Istniejąca baza bez właściwego markera jest odrzucana. Nie używamy mocków autoryzacji; fixture i konta są tylko testowe. Konfiguracja połączenia zmienia się wyłącznie w tymczasowej instalacji testowej, nie na stronie LocalWP. Vite pozostaje uruchomiony.

RSVP, płatności, publikacja i uploady nie istnieją w etapie 2. Przyszłe zmiany danych otrzymają osobne wersjonowane migracje i testy na izolowanej bazie; nie będą wykonywane przez payload szkicu.

## Konta i bootstrap — etap 3

AuthService używa wp_insert_user z jawną rolą microsite_customer, wp_signon z adresem email, natywnych cookies i wp_logout. Nie ma własnego magazynu haseł ani JWT. Publiczne endpointy nie otrzymują X-WP-Nonce anonimowego użytkownika. Po wp_signon przechwytujemy natywny set_logged_in_cookie tylko na czas tej operacji, ustawiamy cookie w bieżącym kontekście PHP i current user. Dzięki temu nonce zwracany w odpowiedzi jest związany z NOWYM tokenem sesji, a nie pustym/poprzednim tokenem. To sprawdzono kolejnym prawdziwym żądaniem HTTP.

Dokument /app/* jest generowany pod originem WP z Cache-Control: no-store, private, max-age=0, Vary: Cookie i X-Frame-Options: SAMEORIGIN. WordPress rozpoznaje cookies przed zbudowaniem HTML. Zalogowany bootstrap jest następnie weryfikowany przez chroniony GET /session z przekazanym nonce, bez migania loginu. Anonimowy bootstrap jawnie zawiera user:null i nonce:null; nie udajemy, że publiczny REST bez nonce odczyta sesję. Wygaśnięty nonce/sesja wymaga ponownego logowania lub świeżego dokumentu; zapisy nie są automatycznie ponawiane.

## CSRF operacji kont

AuthCsrf tworzy losowy 256-bitowy kontekst przeglądarki z czasem utworzenia i podpisem HMAC WordPressa. Jest przechowywany w cookie HttpOnly, SameSite=Strict, Secure przy HTTPS, z limitem 30 minut. Nazwa cookie jest specyficzna dla strony. Dokument otrzymuje oddzielny token HMAC związany z tym kontekstem. POST /auth/login i /auth/register wymagają łącznie:

- Content-Type JSON i obiektu danych;
- dokładnie originu home_url (z uwzględnieniem schematu i portu), bez zaufania do nagłówków proxy;
- braku Sec-Fetch-Site: cross-site;
- prawidłowego, nieprzeterminowanego podpisanego cookie oraz X-Microsite-CSRF zgodnego z nim.

Samo publiczne WP nonce nie jest używane jako ochrona tych operacji. Token z innego kontekstu przeglądarki nie działa. Brak Origin jest odrzucany; klient HTTP musi najpierw pobrać shell z cookie i wysłać prawidłowy Origin i token. Błąd kontekstu wskazuje na potrzebę odświeżenia dokumentu. Nie dodano publicznego endpointu ujawniającego nonce zalogowanego użytkownika.

## Limity i administracja

AuthRateLimit ogranicza wszystkie zweryfikowane kontekstowo próby logowania do 10 i rejestracji do 5 na bezpośredni adres REMOTE_ADDR w stałym oknie 15 minut. Nazwa klucza IP jest hashowana, nie zapisujemy haseł ani cookies. Inicjalizacja licznika i SQL increment są atomowe, więc równoległe próby nie gubią zliczeń. Po przekroczeniu limitu jest 429 i Retry-After do końca okna. Liczniki zapisane jako wygasające opcje transient są sprzątane przez WordPress. Za reverse proxy trzeba świadomie zaprojektować zaufane źródło adresu/gateway limitujący; nie przyjmujemy dowolnego X-Forwarded-For od klienta.

Rejestracja respektuje users_can_register. Zastane 0 na LocalWP nie zostało zmienione. Nowe konto zawsze jest klientem, nawet jeśli domyślna rola strony jest inna. Klient jest przekierowywany z wp-admin do /app/sites i nie widzi admin bara; admin-ajax jest pozostawiony dla natywnych mechanizmów, a administrator z manage_options zachowuje dostęp. Reset hasła i weryfikacja emaila pozostają wymagane przed publicznym uruchomieniem.

## Panel i prywatny stan

History API router obsługuje login/register/sites/sites/new/sites/:id, z /new przed identyfikatorem. Powrót po loginie dopuszcza wyłącznie lokalne trasy projektów pod bazą aplikacji; zewnętrzne URL i inne ścieżki są odrzucane. Anonimowy użytkownik jest kierowany do loginu, zalogowany z widoków kont do projektów.

SessionProvider przechowuje stan i nonce wyłącznie w pamięci. API używa credentials:same-origin i aktualizuje nonce z X-WP-Nonce. 401 lub rest_cookie_invalid_nonce czyści tożsamość; zwykłe 403 uprawnień nie wylogowuje. BroadcastChannel przenosi tylko komunikat zmiany tożsamości, bez tokenów, i usuwa prywatny stan innych kart. Powrót fokusu ponownie sprawdza sesję (wykrywa też natywne wylogowanie poza panelem). Żądania starego nonce nie mogą wyczyścić lub nadpisać nowej sesji. Prywatne komponenty są kluczowane użytkownikiem/projektem, odczyty anulowane AbortControllerem, a odpowiedzi po odmontowaniu ignorowane. Nie ma cache prywatnych projektów w localStorage/sessionStorage. Po odczytaniu bootstrapu usuwamy także user/nonce z jego elementu DOM i statycznej konfiguracji JS; aktualna tożsamość pozostaje tylko w stanie sesji.

Lista korzysta z paginacji. Tworzenie odczytuje typy i zgodne szablony z katalogu; nie zakłada basic-page we wspólnej logice. Wspólny EditorView pobiera projekt, obsługuje nazwę, dirty state, błędy i zapis. Rejestr editors/registry.ts wiąże siteType z modułem Fields/Preview. BasicPageEditor importuje istniejący schemat JSON dla limitów i palety oraz generowany typ. Nie ma drugiego schematu walidacji ani generatora całego formularza.

Save changes przesyła pełny draft; pola są wyłączone do odpowiedzi. Sukces i snapshot pochodzą z odpowiedzi serwera, błędy zachowują formularz. Blokada synchroniczna chroni przed podwójnym wysłaniem. Router pyta przed opuszczeniem brudnego edytora (także historia), a beforeunload chroni reload/zamknięcie w zakresie wspieranym przez przeglądarkę. Podgląd renderuje JSX i ograniczone warianty CSS z bieżącego formularza; nie jest publicznym rendererem.

## Etap 4

Kontrakt, temporalna normalizacja, routing prywatnego preview i niezależne renderery są opisane w [BIRTHDAY-INVITATION.md](BIRTHDAY-INVITATION.md). SiteValidator zwraca teraz zwalidowany i znormalizowany draft; SiteService zapisuje ten wynik. Opcjonalny zaufany normalizer jest przypisany do definicji typu w PHP, a nie wskazywany przez żądanie. basic-page nie wymaga normalizera. Publiczny katalog nadal nie ujawnia callbacków, schematów ani rendererKey. Generator TS obsługuje także number/integer i pola optional.

## Etap 5

[Publikacja](PUBLICATION.md) opisuje atomowy snapshot, blokadę współbieżności, centralny serwis uprawnień i CLI, kontrakt prywatnego DTO/API oraz osobny publiczny entry Vite. Prywatny podgląd i publiczna powłoka współdzielą renderer. Basic-page ma wydzielony wspólny komponent i style. Publiczny dokument zawsze używa produkcyjnego builda, nie inicjuje kont ani prywatnego API. RSVP pozostaje kolejnym etapem.

## Etap 6 — RSVP

[RSVP.md](RSVP.md) opisuje opcjonalną funkcję birthday-invitation, kompatybilne rozszerzenie kontraktu v1, osobne tabele odpowiedzi i usuniętych operacji, idempotencję, sekret zarządzania i zasady czasowe. Publication i RSVP współdzielą ProjectLock. Publiczne formularze i oddzielna powłoka /rsvp/manage/ nie importują kont/routera panelu. Prywatny widok /app/sites/:id/responses korzysta z tego samego klienta sesji i nonce co CRUD. AssetManifest zbiera CSS także z importowanych statycznie chunków Vite, co jest konieczne przy trzech entry i współdzielonych stylach. Nie zmieniano animacji ani własnych SVG.
