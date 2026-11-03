# Wdrożenie zamkniętego stagingu

Nie wykonano zewnętrznego wdrożenia. Instrukcja dotyczy osobnej instalacji WordPress z syntetycznymi danymi. Nie kopiuj bazy LocalWP ani prywatnych projektów. Płatności, reset hasła, weryfikacja emaila i konfiguracja dostarczania wiadomości pozostają poza tym etapem.

## Wymagania

- Osobny single-site WordPress >=6.6; audyt wykonano na 7.1.4. Nie przeprowadzono macierzy starszych wersji/multisite.
- PHP >=8.2; sprawdzono 8.4.27. Potrzebne mysqli, mbstring, JSON, hash, ctype, OpenSSL, PCRE i standardowe funkcje dat/RNG. Polecane rozszerzenia WordPressa, np. curl/DOM/fileinfo, zgodnie z wymaganiami hostingu. Nie potrzeba rozszerzenia intl ani zip do działania tej wtyczki.
- MySQL/MariaDB z InnoDB, utf8mb4, transakcjami, GET_LOCK/RELEASE_LOCK oraz uprawnieniami tworzenia/aktualizacji tabel i indeksów. Nie zakładaj konkretnego dostawcy hostingu.
- Certyfikat TLS dla docelowej domeny, działające HTTPS, obsługa permalinków/rewrite i WordPress REST API. Rozszerzenia bezpieczeństwa/WAF nie mogą usuwać wymaganych nagłówków.
- Wyłącz cache tras dynamicznych opisanych niżej. Zapewnij WP-Cron lub poprawne wywoływanie wp-cron; usuwa wygasłe znaczniki idempotencji, nie dane odpowiedzi.
- Runtime nie wymaga Node, npm, Composer, vendor ani Vite. WP-CLI jest potrzebny administratorowi do obecnego mechanizmu nadawania prawa publikacji; hosting bez możliwości jego uruchomienia wymaga najpierw uzgodnienia tego dostępu, nie omijania uprawnienia przez bazę. Do budowy poza serwerem: Node 22.13+ z linii 22 lub >=24 (sprawdzono 26.0.0), npm (sprawdzono 11.12.1), Python >=3.10. Lockfile v3 przypina zależności. Node 22.12 i 23 nie spełniają engines ESLint 10.

## Odtworzenie paczki

W katalogu `wp-content/plugins/microsite-core/app` czystego checkoutu:

```sh
npm run release:staging
```

Komenda wykonuje npm ci, sprawdzenie kontraktów, lint, TypeScript, build i pakowanie. Build produkcyjny nie odczytuje adresu WordPressa, nie wymaga WP-CLI ani bazy. W LocalWP komendy WP/PHP wykonuj przez **Open site shell**. Nie buduj releasu przez npm ci w katalogu, którego zależności są właśnie używane do aktywnej pracy; preferowany osobny checkout/build workspace.

Archiwum i zewnętrzna suma SHA-256 powstają w `dist/staging/` repozytorium. Samo powtórzenie pakowania już zbudowanych plików:

```sh
npm run package:staging
```

Paczka ma uporządkowane wpisy, stałe czasy z SOURCE_DATE_EPOCH lub ostatniego commita, BUILD.json z wersją, SHA commita, flagą dirty i hashem zawartości oraz SHA256SUMS dla plików. Ta sama zawartość i metadane dają tę samą paczkę; różna wersja Node/npm może zmienić wynik kompilacji, dlatego zachowaj użyte wersje. Dirty=true oznacza, że SHA commita jest tylko bazą, a rzeczywisty stan identyfikuje contentSha256. Nie traktuj paczki dirty jako czystego commita.

Zawartość: wtyczka PHP, kontrakty JSON, wszystkie szablony PHP i wymagany invitation-loader.css, miniatury, app/dist z manifestem i dynamicznymi chunkami/fontami/obrazem, motyw, notices/licencje zależności, ta instrukcja, raport audytu i narzędzie preflight. Brak core WP, wp-config.php, .env, bazy, uploadów, node_modules, źródeł React, testów i nagrań. Zależności PHP poza WordPressem nie występują. Nie usuwaj kontraktów ani templates/invitation-loader.css — są czytane przez PHP podczas requestu.

## Przygotowanie hostingu i HTTPS

1. Przygotuj osobny WordPress i osobną bazę, bez danych klienta. Zabezpiecz staging hasłem na poziomie hostingu/reverse proxy lub allowlistą/VPN. Ta ochrona musi obejmować także publiczne zaproszenia i API. Przy HTTP Basic Auth potwierdź, że hosting poprawnie obsługuje fetch/REST i nie interpretuje hasła bramki jako hasła aplikacyjnego WordPressa; alternatywą jest allowlista/VPN. **Noindex nie stanowi kontroli dostępu.**
2. Włącz certyfikat i przekierowanie HTTP → HTTPS dla całego hosta. Ustaw `home` i `siteurl` na prawidłowe HTTPS tego WordPressa, nie przykładową domenę z dokumentacji. Origin dokumentu, assetów aplikacji i REST ma być zgodny; WordPress w podkatalogu wymaga odpowiednich ścieżek home/siteurl/rewrite.
3. W wp-config.php stagingu ustaw WP_ENVIRONMENT_TYPE='staging' i FORCE_SSL_ADMIN=true. Nie wdrażaj lokalnego wp-config.php. WP_DEBUG_DISPLAY ma być false; diagnostyka, jeśli potrzebna, do pliku poza katalogiem publicznym. Sekrety i WordPress salts pochodzą z konfiguracji tego środowiska, nigdy z buildu.
4. Przy TLS terminowanym przez proxy administrator hostingu musi sprawić, by WordPress prawidłowo rozpoznawał is_ssl(). Nagłówki forwarded można uznawać wyłącznie od zaufanego proxy nadpisującego dane klienta. Nie dodawaj wtyczce bezwarunkowego zaufania do X-Forwarded-Proto/Host. [Oficjalna instrukcja HTTPS WordPressa](https://developer.wordpress.org/advanced-administration/security/https/) opisuje tę zależność i FORCE_SSL_ADMIN.
5. Wyłącz indeksowanie w WordPressie (`blog_public=0`). Nie włączaj publicznej rejestracji (`users_can_register=0`). Wyłącz wysyłkę rzeczywistych wiadomości na poziomie stagingu/transportu; korzystaj z adresów syntetycznych. Nie konfiguruj bramek płatności.

Nie ustawiaj HSTS obejmującego wszystkie subdomeny bez znajomości reszty infrastruktury. Zweryfikuj TLS i Secure cookies przez rzeczywiste żądanie HTTPS — wynik is_ssl() w WP-CLI nie potwierdza działania proxy.

## Instalacja kodu

1. Wykonaj backup plików i bazy stagingu przed aktywacją/aktualizacją. Przechowuj backup poza web rootem. Zapewnij możliwość zatrzymania zapisów w razie rollbacku.
2. Rozpakuj archiwum w katalogu roboczym poza web rootem. Sprawdź zewnętrzną sumę ZIP i SHA256SUMS (np. sha256sum/shasum zgodnie z systemem).
3. Prześlij wyłącznie oba katalogi z `wp-content/plugins/microsite-core` oraz `wp-content/themes/microsite-shell` do odpowiednich katalogów WordPressa. Preferuj atomową podmianę katalogu wtyczki. Przy nadpisywaniu usuń stary app/dist i ewentualne pliki developerskie, żeby nie pozostawić starych chunków, test-results, .vite-dev.json, .env lub testów. Nie usuwaj innych wtyczek, danych ani uploadów.
4. Nie przesyłaj całego repozytorium, paczki ZIP, docs lub tools do katalogu publicznego. Narzędzie tools/staging-preflight.php uruchamiaj z katalogu wdrożeniowego poza nim.
5. Aktywuj Microsite Core w panelu administratora lub `wp plugin activate microsite-core`. Init instaluje role/capabilities (wersja 2), dwie tabele RSVP (wersja 1) i zadanie porządkowe. Migracje są idempotentne. Sprawdź wersje i tabele; nie ustawiaj ich numerów ręcznie w celu ukrycia błędu.
6. Motyw Microsite Shell jest opcjonalny. Aktywuj go tylko na czystym stagingu albo po sprawdzeniu istniejącej strony. Aplikacja, publiczne zaproszenia i API nie zależą od aktywnego motywu.
7. Włącz ładne permalinki i odśwież reguły. Na nowym stagingu można użyć `wp rewrite structure '/%postname%/'` oraz `wp rewrite flush`. Apache potrzebuje prawidłowych reguł/AllowOverride, Nginx odpowiednika try_files kierującego nieistniejące ścieżki do index.php z query string. Nie nadpisuj konfiguracji nieznanego serwera gotowym blokiem dla innego katalogu.
8. Uruchom `wp eval-file /katalog-wdrozenia/tools/staging-preflight.php --user=<administrator>`. Skrypt nie zmienia ustawień, nie wypisuje sekretów i nie zastępuje testów HTTP. Normalny bootstrap WP wykonuje istniejące idempotentne migracje.

## Cache i logi

Dla faktycznej ścieżki home (również przy instalacji w podkatalogu) całkowicie wyłącz page/edge cache oraz stale serving dla:

- `/app/` i wszystkich podstron, w tym iframe i prywatnego podglądu;
- `/s/*`, także 404 po wycofaniu publikacji;
- `/rsvp/manage/` i wariantów z query string; fragment sekretu nigdy nie trafia do serwera;
- `/wp-json/microsites/v1/*` oraz requestów zawierających `rest_route=/microsites/v1...`;
- `/wp-login.php`, `/wp-admin/*` oraz żądań z cookies sesji WordPressa.

Nie ignoruj Cache-Control: no-store/private, Vary: Cookie/X-WP-Nonce i Set-Cookie. Cache panelu może ujawnić cudzą tożsamość lub zatrzymać nonce; cache publicznego zaproszenia może pokazywać wycofaną treść. Identyfikator publicId nie chroni treści — każdy posiadacz linku może ją odczytać. Hashowane statyczne pliki app/dist/assets można cache’ować; zachowaj spójny manifest i kompletną wersję plików. Wyczyść cache przy wdrożeniu/rollbacku. Nie cache’uj REST odpowiedzi z błędami ani zarządzania odpowiedzią gościa.

Nie loguj body logowania/rejestracji/RSVP ani nagłówków Cookie, Set-Cookie, X-WP-Nonce, X-Microsite-CSRF, X-Microsite-RSVP, Idempotency-Key. Nie włączaj sesyjnego nagrywania widoków kont i odpowiedzi. Przejrzyj ustawienia proxy, WAF/APM i debugowania WP — kod aplikacji nie zapisuje tych sekretów w logach. Nie udostępniaj dumpów, testów lub katalogów z listingiem. Limiter widzi REMOTE_ADDR; za proxy potrzebna jest świadoma konfiguracja ochrony na brzegu, ponieważ nie ufamy dowolnemu X-Forwarded-For.

## Konta i syntetyczny projekt

Rejestracja ma pozostać zamknięta. Administrator przygotowuje konta testowe z rolą microsite_customer w panelu WordPressa lub przez WP-CLI z hasłem wprowadzonym bezpiecznie w terminalu (`--prompt=user_pass`), bez wysyłki powiadomienia. Nie umieszczaj haseł w rozmowie, komendach zapisanych w repozytorium lub logach.

Zaloguj konto A w `/app/login`, przejdź do galerii, obejrzyj demo i utwórz projekt z fikcyjnym imieniem, przyszłą datą, miejscem i opcjonalnym RSVP. Basic page utwórz oddzielnie przez ten sam katalog. Konto B służy do potwierdzenia izolacji.

Prawo publikacji nadaje administrator jawnie:

```sh
wp microsite publication-right <project-id> grant --user=<administrator>
```

Właściciel publikuje dopiero po uzupełnieniu pól. Zapis szkicu i live pozostają rozdzielone. Nie importuj prywatnych projektów z LocalWP. Reset hasła, weryfikacja adresu i dostarczanie wiadomości są wymagane przed otwartymi testami rejestracji.

## Rollback

- Zatrzymaj zapisy i zachowaj diagnostykę bez prywatnych danych. Przywróć cały poprzedni katalog wtyczki wraz z jego manifestem i assetami; nie mieszaj chunków wersji. Motyw przywróć tylko, jeśli był zmieniany.
- Obecne poprawki nie zmieniają schematu DB (RSVP 1, role 2). Przy powrocie do zgodnej wersji zwykle wystarczy kod i czyszczenie cache, ale należy sprawdzić zgodność danych oraz capability.
- Cofnięcie plików **nie cofa migracji**. Jeśli nowa wersja zmieniła schemat/format i poprzednia go nie obsługuje, wymagane jest przywrócenie odpowiedniego backupu bazy przy wstrzymanych zapisach. Oznacza to utratę zmian po backupie; nie obiecuj bezstratnego downgrade.
- Dezaktywacja nie usuwa projektów, tabel ani odpowiedzi. Nie uruchamiaj resetów lub kasowania tabel jako procedury rollbacku. Wycofanie jednej ministrony odbywa się przez Unpublish, a nie usunięcie bazy.

## Opcjonalna migracja danych

Preferowana jest czysta instalacja. Jeśli migracja stanie się konieczna, wymaga osobnego zakresu i zgody na konkretne dane: backup, odseparowana baza, brak operacji na produkcji, dry-run zmiany URL i weryfikacja po migracji. Stosuj narzędzie obsługujące serializację, np. [WP-CLI search-replace](https://developer.wordpress.org/cli/commands/search-replace/), z jawną selekcją tabel i `--dry-run` przed zapisem. Nie wykonuj zwykłego SQL REPLACE na zserializowanych metadanych. Nie kopiuj kont, sesji, sekretów i odpowiedzi klientów do demonstracji stagingowej.

## Checklista po rzeczywistym wdrożeniu

Te kontrole są wymagane na docelowym środowisku i nie są oznaczone jako lokalny PASS:

- HTTPS, poprawny certyfikat, przekierowanie HTTP, brak mixed content i poprawne Secure/HttpOnly cookies; rozpoznawanie TLS przez proxy.
- Ochrona całego stagingu na poziomie hostingu i brak indeksowania.
- Logowanie A/B, odświeżenie i wylogowanie; brak cudzych danych lub nonce po zmianie użytkownika, brak cache HIT na trasach prywatnych.
- Galeria, demo, pojedyncze utworzenie, niepełny szkic, bezpośredni krok URL i refresh; prawdziwy live preview bez zapisu, Preview saved draft.
- Jawne nadanie prawa, publikacja, anonimowy odczyt (w obrębie ochrony stagingu), aktualizacja, Unpublish i natychmiastowe 404 także przez CDN.
- RSVP: odpowiedź syntetycznego gościa, statystyki właściciela, prywatny link, zmiana i usunięcie, brak sekretów w logach.
- QR zeskanowany **innym fizycznym telefonem**, link otwarty z WhatsApp/Messengera; ochrona hostingu może wymagać ponownego logowania w przeglądarce aplikacji.
- Intro, pauza, replay i formularz na fizycznym iOS Safari oraz Android Chrome. Emulacja/Playwright nie zastępuje tej kontroli.
- Brak publicznego dostępu do szkiców, odpowiedzi innych gości, testów, dumpów i logów.

## Dane potrzebne do wdrożenia

Potrzebne są: dostawca i parametry hostingu, docelowa domena/subdomena, sposób ustanowienia HTTPS i ewentualny reverse proxy/CDN, dostępny kanał przesyłania plików (panel/SFTP/SSH), dostępność WP-CLI, wersje PHP/WP/DB i zasady cache/ochrony stagingu. Dostępy należy udostępniać przez bezpieczny mechanizm hostingu lub menedżer sekretów — nie w rozmowie. Bez tych danych nie wykonujemy deployu ani zmiany DNS.
