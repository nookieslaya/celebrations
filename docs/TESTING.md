# Testy backendu i bezpieczniki bazy

W LocalWP wybierz **Open site shell** i przejdź do `wp-content/plugins/microsite-core/app` istniejącej strony. Node musi być dostępny w tej powłoce.

```sh
npm ci
npm run verify
npx playwright install chromium
npm run test:integration
WP_SITE_URL="$(wp option get home)" npm run test:e2e
```

Testy integracyjne używają Playwright APIRequestContext i asercji Node do wykonywania rzeczywistych żądań HTTP na prawdziwym WordPressie i MySQL LocalWP. Nie jest to mock ani wewnętrzny dispatch. Użytkownicy logują się przez standardowy wp-login.php; fixture nonce jest kopiowany wyłącznie do katalogu mu-plugins tymczasowej instalacji i wymaga zalogowanej sesji oraz stałej MICROSITE_INTEGRATION_TEST i prefiksu testowej bazy. Fixture nie jest ładowany przez wtyczkę strony.

Testowy WP_ENVIRONMENT_TYPE=development wyłącza lokalny marker assetów, więc testy sprawdzają także produkcyjny manifest i obie ścieżki panelu przy nadal działającym Vite strony.

Runner wymaga WP-CLI, PHP i MySQL z Open site shell oraz uprawnień do oddzielnej bazy testowej. Domyślna nazwa microsite_test_<hash-katalogu-projektu> jest stała. Pierwszy przebieg tworzy bazę, następne przełączają połączenie do tej samej bazy i czyszczą wyłącznie tabele ms_test_* przed przygotowaniem powtarzalnych fixture. Baza pozostaje po zakończeniu, także po błędzie testu. Nie zmieniamy wp-config.php strony ani jej aktywnej bazy.

Core i motywy są kopiowane do tymczasowego katalogu. Tam WordPress jest przygotowywany na tej samej dedykowanej bazie. Serwer testowy wybiera wolny port i produkcyjne assety, bez zatrzymywania Vite. Połączenie i socket MySQL są wykrywane z konfiguracji LocalWP, bez hardkodowanych ścieżek.

## Bezpieczniki i własność

Przed operacjami na bazie runner odrzuca DB_NAME strony LocalWP i wymaga prefiksu microsite_test_. Istniejącą bazę wolno wyczyścić tylko przy zgodnym trwałym markerze własności projektu w ~/.cache/microsite-core/<hash-projektu>/<nazwa-bazy>.json. Marker zawiera nazwę bazy, katalog projektu i identyfikację połączenia; nie zawiera hasła. Powstaje dopiero po utworzeniu dedykowanej bazy. Brak lub niezgodność oznacza odmowę, nigdy automatyczne przejęcie bazy.

Każde polecenie WP ponownie sprawdza tymczasową konfigurację i marker przebiegu. Przed czyszczeniem kontrolowany jest też table_prefix=ms_test_. Używane jest wp db clean, nie wp db drop/reset: baza nie jest usuwana. Blokada katalogowa <nazwa-bazy>.lock z PID nie pozwala uruchomić dwóch zestawów na jednej bazie równocześnie.

TEST_DB_NAME opcjonalnie wybiera inną dedykowaną bazę z tymi samymi zabezpieczeniami. Bezpiecznik można sprawdzić bez operacji na bazie:

```sh
TEST_DB_NAME="$(wp config get DB_NAME)" node ../tests/run-integration.mjs --guard-only
```

Oczekiwana jest odmowa z niezerowym kodem. Poprawna nazwa i --guard-only nie tworzą ani nie czyszczą bazy. Po zwykłym zakończeniu znika tymczasowy katalog i blokada, ale pozostają baza oraz trwały marker. Po wymuszonym zabiciu sprawdź PID przed ręcznym zdjęciem starej blokady. Nie usuwaj markera działającej bazy i nie kieruj testów na bazę LocalWP.

## Pokrycie

Sprawdzane są: defaults i backendowe wersje, właściciel sesji, unikalne publicId, własna lista i paginacja, anonimowy dostęp, obustronna izolacja A/B, niezależne capabilities, administrator z jawnym uprawnieniem, brak/błędny nonce przez cookies (POST/PATCH), poprawny odczyt i edycja, zakazane pola systemowe, limity i pełna walidacja draft, brak zmian po nieudanej walidacji, konflikty zapisanych wersji, brak publicznego/default REST ujawnienia CPT, idempotentne role i brak diagnostyki PHP.

`npm run verify` obejmuje sprawdzanie wygenerowanego kontraktu, ESLint, TypeScript i build. PHPCS/CI nie zostały jeszcze dodane; składnia PHP jest sprawdzana przez php -l. E2E panelu zachowują dotychczasowe testy obu tras i nawigacji. Test HMR jest uruchamiany tylko jawnie przy TEST_HMR=1.

## Konta i E2E etapu 3

Runner po regresji backendu uruchamia accounts.mjs z rzeczywistymi HTTP cookies i browser-flows.mjs w Chromium na produkcyjnym buildzie. Rejestracja jest przełączana wyłącznie w jego stałej testowej bazie. Testuje disabled registration, walidację i rolę, kontekst CSRF i obcy Origin, login, nonce nowej sesji, logout i blokadę starego nonce, limity/Retry-After oraz administrację klienta i administratora.

Przepływy przeglądarkowe obejmują rejestrację → katalog → utworzenie → edytor → pełny zapis → refresh, odmowę dla klienta B, wygaśnięcie sesji, bezpieczny next, paginację, zachowanie danych po realnym błędzie walidacji, ostrzeżenia nawigacji i beforeunload oraz produkcyjny build bez żądań Vite. Awaria sieci i opóźniona odpowiedź są dodatkowo wywoływane na granicy HTTP przeglądarki; nie mockują backendowej autoryzacji ani odpowiedzi walidatora. Pozostałe testy używają rzeczywistego serwera/bazy.

Smoke tests w app/tests są anonimowe, więc nie tworzą danych LocalWP i respektują zastane ustawienie rejestracji. Test HMR chwilowo zmienia moduł AuthView.tsx i sprawdza aktualizację bez utraty emaila. Nie edytuj tego pliku równolegle z TEST_HMR=1. Nie ma potrzeby zatrzymywania istniejącego Vite do testów produkcji.

PHPCS nie było skonfigurowane w poprzednim etapie i nie jest raportowane jako uruchomione. CI nie ma skonfigurowanego workflow i nie zostało uruchomione na GitHubie; lokalny PASS nie oznacza CI PASS. Nie uruchomiono testów resetu hasła, weryfikacji emaila ani funkcji kolejnych etapów, ponieważ nie są implementowane.

## Etap 4

Pełny runner zawiera birthday.mjs: kontrakt/rejestry, defaults i szkic bez daty, wiek/palety/limity/HTML/unknown fields, DST gap/fold i offset Kathmandu, prywatny HTML/REST, zachowanie basic-page, tworzenie i zapis, dirty preview (także błędny zapis), intro/skip/focus/confetti, details shortcut, reduced motion i screenshoty trzech viewportów oraz maksymalnych treści. Sprawdza również brak żądań chunku BirthdayParty na loginie/liście/edytorze i działanie produkcyjne bez Vite. TEST_SCOPE=birthday uruchamia tylko ten zakres, na tej samej bazie. PHPCS i CI pozostają istniejącym długiem i nie są konfigurowane w tym etapie.

## Publikacja — etap 5

Pełne npm run test:integration uruchamia także tests/publication.mjs: rzeczywiste sesje i nonce, prawa projektu nadawane CLI, własność, gotowość, niezależny snapshot, błędy zapisu/blokadę na drugim połączeniu MySQL, flow przeglądarki i publiczny odczyt bez cookies/Vite. QR SVG i PNG są pobierane z UI, rasteryzowane i dekodowane przez jsqr 1.4.0; wynik jest porównywany z backendowym URL. Artefakty publikacji: app/test-results/publication, osobno od smoke/birthday. TEST_SCOPE=publication npm run test:integration to węższy przebieg 8 grup na tej samej stałej bazie, a nie pełna regresja. TEST_SCOPE=birthday nadal uruchamia wyłącznie 10 grup urodzinowych.

## RSVP — etap 6

TEST_SCOPE=rsvp npm run test:integration uruchamia tests/rsvp.mjs na tej samej stałej bazie. Pełny runner obejmuje także wcześniejsze etapy. Testowy zegar RsvpService jest ustawiany przez opcję wyłącznie w MU fixture instalacji izolowanej, sprawdzającej MICROSITE_INTEGRATION_TEST i nazwę bazy. Produkcyjny endpoint nie przyjmuje zegara od klienta. Granice terminu/eventu sprawdzane są bez oczekiwania. HTTP testuje prawdziwe cookies/nonce/własność organizatora, sekrety gościa, idempotencję i indeksy DB, tombstone/wygaśnięcie, limiter/honeypot/origin, limit payloadu i migracje. Równoległe żądania klienta nie zastępują osobnego testu obciążeniowego wielu workerów — tymczasowy PHP server pozostaje prostym serwerem testowym.

E2E wykorzystuje build produkcyjny przy nadal działającym Vite LocalWP. Utrata odpowiedzi jest wstrzykiwana po rzeczywistym route.fetch, więc pierwszy rekord faktycznie powstaje w DB; ponowienie musi odzyskać ten sam wynik. Sprawdzane są publiczny formularz, niezależny management po wycofaniu, brak tworzenia danych przez preview, statystyki organizatora, usunięcie, filtr/paginacja, reduced motion i klawiatura. Artefakty w app/test-results/rsvp, bez commitowania. Smoke na LocalWP jest nadal anonimowy i nie wysyła RSVP.


## Galeria i kreator — 0.7.0

`TEST_SCOPE=gallery npm run test:integration` sprawdza krytyczny nowy przepływ w pięciu grupach, używając dotychczasowej stałej bazy i produkcyjnych assetów bez Vite. Szczegóły pokrycia i generowania miniatur: [GALLERY-WIZARD.md](GALLERY-WIZARD.md). `UPDATE_TEMPLATE_THUMBNAILS=1` jawnie odświeża źródłowe PNG; zwykły przebieg zapisuje tylko artefakty testowe. Własność, sesje, publikacja i RSVP są rzeczywistymi operacjami HTTP. Symulacje sieci dotyczą wyłącznie opóźnienia/utraty odpowiedzi, a ukrycie kroku używa zmiany deklaracji funkcji katalogu na granicy odpowiedzi testowej, bez mockowania uprawnień backendu.


## Podgląd

TEST_SCOPE=preview obejmuje cztery grupy krytycznych zachowań izolowanego renderera; wyniki ostatniego przebiegu są w STATUS.md. scripts/review-preview-dev.mjs jest krótkim testem HMR z fikcyjnymi danymi, bez operacji na bazie. Domyślnie kolejne poprawki mają przechodzić tylko podstawową kontrolę kodu/builda, zgodnie z aktualną preferencją użytkownika; nie uruchamiaj całej regresji lub macierzy urządzeń przy każdej zmianie.
