# Stan faktyczny — 2026-11-01

Etap 6: wtyczka 0.6.0. RSVP i panel odpowiedzi są wdrożone jako rozszerzenie istniejącej publikacji. Pozostawiono istniejący Vite, aktywny motyw i konfigurację LocalWP. users_can_register nadal 0. Nie resetowano bazy strony. Testy ponownie używają microsite_test_430601248a09bf6c.

## Działający zakres

Opcjonalne content.rsvp w birthday-invitation/schemaVersion 1: enabled, limit 1–20 (włącznie z odpowiadającym), deadline lokalny w strefie wydarzenia i kanoniczny UTC. Rozszerzenie jest kompatybilne: starsze szkice i snapshoty bez RSVP pozostają wyłączone i nie są przepisywane. JSON Schema jest źródłem limitów/defaults/typów; generator obsługuje boolean. basic-page nie obsługuje RSVP. Termin korzysta z istniejącego EventDate/IANA/DST i nie może być po wydarzeniu, także po zmianie jego daty/strefy.

Dwie wersjonowane tabele InnoDB z prefiksem WordPressa: odpowiedzi oraz nieosobowe znaczniki usuniętych operacji. Unique sekretu i operacji projektu, indeks listy/filtra. Migracja jest idempotentna i sprawdza kluczowe indeksy/engine przed oznaczeniem wersji. Trwałe usunięcie projektu usuwa odpowiedzi i sekrety; zwykła dezaktywacja niczego nie usuwa.

Gość podaje imię, yes/no i liczbę osób. Bez konta, emaila, telefonu i danych wrażliwych. Wyłącznie publikacja określa ustawienia formularza. Niekompletny draft pozostaje prywatny. Czas serwera zamyka tworzenie/zmiany/wycofanie przy równości deadline lub startu; usunięcie przez sekret pozostaje dostępne. Wycofanie publikacji i wyłączenie RSVP nie kasuje odpowiedzi. Obniżenie limitu nie zmienia historycznych rekordów.

Sekret i losowa część klucza po 256 bitów, Web Crypto. Baza przechowuje tylko hash sekretu/klucza i fingerprint pierwotnego payloadu. Bez surowych IP/user-agent w odpowiedziach. Idempotentne retry odzyskuje istniejące id także po zamknięciu, konflikt sekretu/payloadu daje 409. Usunięcie trwale kasuje dane i transakcyjnie zapisuje znacznik operacji na 48 godzin; klucz nowej operacji jest ważny maksymalnie 24 godziny, więc po sprzątnięciu znacznika nie odtworzy danych. WP-Cron sprząta tylko znaczniki, nie odpowiedzi.

Prywatny link /rsvp/manage/#{id}.{secret} używa fragmentu i dedykowanego nagłówka. Osobna produkcyjna powłoka działa po wycofaniu zaproszenia, nie ujawnia jego treści, ma no-store/no-referrer/CSP, bez kont/analityki/zewnętrznych zasobów. Gość czyta/zmienia/wycofuje własną odpowiedź oraz potwierdza trwałe usunięcie. Musi zachować link; nie ma odzyskiwania bez emaila. Nie ma sekretów w liście organizatora, zwykłym HTML zaproszenia ani query string.

Panel /app/sites/:id/responses ma stan publicznego RSVP, globalne sumy yes/no/uczestników, listę, filtr, deterministyczną paginację oraz potwierdzane usunięcie. Organizator nie edytuje odpowiedzi. Błędy nie są pokazywane jako poprawne zerowe statystyki. Nie ma listy zaproszonych ani metryki osób, które nie odpowiedziały.

Limit body 2048 bajtów, imię 1–80 Unicode bez HTML, ścisła walidacja relacji yes/no/partySize, honeypot, same-origin bez wildcard CORS, krótko żyjący limiter SQL według hasha bezpośredniego IP. Limit nalicza się raz na request poza powtarzalnym permission_callback WordPressa. Istniejący snapshot, prawo publikacji, konta, CRUD, animacje i SVG zachowano. AssetManifest uwzględnia CSS statycznych importów współdzielonych przez trzy entry.

## Przykład LocalWP

Zaproszenie: http://celebrations.local/s/61b486f3910b58960165852293f4eefa/

Panel odpowiedzi: http://celebrations.local/app/sites/8/responses

Włączono RSVP w istniejącym projekcie demonstracyjnym ID 8 i zaktualizowano jego publikację (administrator ID 1). Nie zmieniano innych projektów ani ustawień rejestracji i nie wysyłano testowych RSVP do bazy LocalWP (potwierdzono 0 rekordów w lokalnej tabeli odpowiedzi). Anonimowy Chromium potwierdził widoczny formularz, HTTP 200, zero cookies, brak żądań do Vite/panelu/kont oraz scrollY=0. To link lokalny, nie hosting dla gości z Internetu.

## Wykonane kontrole

- npm run verify: kontrakty, ESLint, TypeScript i build trzech entry — PASS.
- php -l: 30 własnych plików PHP — PASS. git diff --check — PASS.
- TEST_SCOPE=rsvp npm run test:integration: 11 grup PASS na rzeczywistym WordPressie i stałej osobnej bazie.
- Końcowy pełny npm run test:integration: 68 grup PASS (57 regresji i 11 RSVP), rzeczywiste sesje HTTP, produkcyjny build i ta sama stała baza testowa. Brak diagnostyki PHP. Baza zachowana do kolejnego przebiegu.
- LocalWP: 8 anonimowych smoke/HMR testów PASS, w tym nowa chroniona trasa responses i refresh. HMR zachowuje formularz; Vite pozostaje uruchomiony.
- Bezpiecznik --guard-only z nazwą aktywnej bazy LocalWP odrzuca operację przed resetem/tworzeniem/czyszczeniem — potwierdzony oczekiwany niezerowy kod.
- HTTP RSVP: starsze dane/snapshoty, migracje, katalog typów, limit/typy, DST/UTC i zależność terminu, walidacja Unicode/HTML/yes/no/size, honeypot/body/origin/CORS, hash-only storage, retry i równoległe żądania, konflikt payloadu/sekretu, izolacja sekretów/A-B/sesji/nonce, globalne sumy przy filtrze i paginacji, niższy limit, dokładne granice czasu, replay po zamknięciu, wyłączenie/unpublish/republish, usunięcie i brak wskrzeszenia po wygaśnięciu znacznika, limiter bez bypassu X-Forwarded-For i usunięcie projektu.
- Produkcyjne E2E RSVP: konfiguracja/publikacja organizatora → guest yes dla 3 osób → utrata HTTP po faktycznym zapisie → identyczne retry i jeden rekord → prywatny link → sumy organizatora → zmiana na no przez klawiaturę → nowe sumy → wycofanie publikacji → nadal działające trwałe usunięcie przez sekret → brak rekordu/sum. Preview nie ma przycisku wysyłania i nie tworzy odpowiedzi.
- Dodatkowe E2E: 21 odpowiedzi, usunięcie ostatniej na stronie 2 wraca na stronę 1; filtr zachowuje sumy całego projektu. Formularz działa bez ukończenia intro w normal motion oraz w reduced motion. Publiczny/management build bez Vite, bez cookies i panelu. Zmiana fragmentu odrzuca poprzedni stan odpowiedzi.

## Wygląd i artefakty

Obejrzano formularz mobilny 375 px oraz panel organizatora przy 375×900 i 1440×1000. Czytelne etykiety, focus, zawijanie nazw/akcji, brak poziomego overflow (również asercja). Artefakty: app/test-results/rsvp/ — guest-mobile, guest-desktop, management-mobile, organizer-mobile i organizer-desktop. Osobne katalogi birthday/publication/smoke pozostają zachowane. PNG i build nie są commitowane; prywatny link na testowym zrzucie dotyczy odpowiedzi usuniętej w tym samym E2E.

## Ograniczenia i pominięte kontrole

Brak blokad ukończenia etapu. LocalWP nie jest hostingiem publicznym. Gość musi zachować sekret; brak emaila i odzyskiwania linku. SessionStorage zawiera tylko klucze niepotwierdzonej operacji, nie dane osobowe; po odświeżeniu przy odzyskiwaniu trzeba ponownie podać ten sam payload. Przy wyłączonym storage i utracie karty odzyskanie może być niemożliwe.

Nie dodano płatności, maili/SMS, importu, CSV, indywidualnych zaproszeń, uploadów, retencji odpowiedzi, pytań dodatkowych ani nowych SVG. Ochrona nie zastępuje kontroli publicznego ruchu: NAT dzieli limity, rozproszone boty mogą je obchodzić. Przed publicznym startem: HTTPS, zaufany reverse proxy/ochrona na brzegu, przegląd logowania bez sekretów, polityka danych oraz nadal reset hasła i weryfikacja emaila organizatora.

Nie uruchomiono PHPCS/CI (istniejący dług zgodnie z AGENTS), pełnej macierzy Safari/Firefox/urządzeń ani testu obciążeniowego wielu workerów. Równoległe HTTP sprawdza efekt idempotencji i unikalności, ale prosty testowy PHP server nie zastępuje testu obciążenia. Nie przeprowadzono osobnego testu awarii DB podczas transakcyjnego usuwania ani pełnego audytu dostępności. Dotychczasowe ograniczenia GSAP/tzdb i macierzy PHP/WP pozostają. Znane npm audit: 10 moderate narzędzi lintujących; nie zmieniano zależności ani nie wykonywano audit fix --force.

Szczegóły modelu, API i sekretów: [RSVP.md](RSVP.md). Praca pozostaje lokalna, bez automatycznego commita/push.
