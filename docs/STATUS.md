# Stan faktyczny — 2026-11-01

Etap 3 zakończony. Wtyczka 0.3.0 udostępnia customowe konta i panel połączony z backendem szkiców. LocalWP działa pod http://celebrations.local. Istniejący Vite nadal działa pod adresem zapisanym w .vite-dev.json; nie uruchomiono drugiej instancji i nie zatrzymywano go do testów produkcji. Build produkcyjny jest aktualny. Nie przełączano motywu microsite-shell ani nie resetowano bazy strony.

## Działające widoki i przepływy

/app/login, /app/register, /app/sites, /app/sites/new, /app/sites/{id}. /app/ wybiera login/projekty na podstawie sesji. Działa logowanie email/hasło, natywna sesja cookies, świeży nonce po loginie, rozpoznawanie po odświeżeniu i wylogowanie. Rejestracja nadaje wyłącznie rolę klienta, respektując users_can_register. Zastana i końcowa wartość na LocalWP to 0: panel jawnie informuje o zamkniętej rejestracji. Sposób świadomego włączenia opisano w README; testy włączały ją wyłącznie na nowej bazie testowej.

Lista ma paginację, nazwę, typ, draft, datę i edycję. Tworzenie korzysta z katalogu i zgodnych szablonów. Edytor basic-page obsługuje wszystkie pola, pełny PATCH, jawny zapis, lokalny podgląd, ochronę niezapisanych zmian i blokadę pól podczas zapisu. Błędy zachowują formularz. Prywatny stan jest usuwany po zmianie sesji, także między kartami; zwykły brak capabilities nie jest traktowany jako wygaśnięcie sesji. Klient jest kierowany z wp-admin do panelu, bez admin bara; administrator zachowuje administrację.

## Wykonane kontrole

- npm run verify: kontrakty, ESLint, TypeScript, produkcyjny build — PASS.
- php -l: wszystkie 18 własnych plików PHP, wraz z fixture i motywem — PASS.
- npm run test:integration: 39 grup kontroli PASS na prawdziwym WordPressie 7.1.4, PHP 8.4.27 i nowej osobnej bazie MySQL LocalWP. 17 grup regresji backendu, 8 grup kont/HTTP i 14 grup przeglądarkowych.
- HTTP: disabled registration, minimalna rola, próby eskalacji, walidacja, natywne cookies i nonce nowej sesji, wylogowanie, odrzucenie starego nonce, generyczne błędy loginu, limity i Retry-After. CSRF sprawdzono z obcym/brakującym/null Origin, Sec-Fetch-Site cross-site, brakującym tokenem i tokenem z innego kontekstu przeglądarki.
- Produkcyjne E2E Chromium: rejestracja → katalog → projekt → edycja wszystkich pól → podgląd → zapis → refresh, logout/login i bezpośredni chroniony adres, izolacja B, rzeczywiste odrzucenie walidacji bez utraty pól, awaria sieci bez retry, opóźniony zapis z zablokowanymi polami, ostrzeżenie nawigacji i beforeunload, wygaśnięcie sesji i zmiana konta bez starych projektów, paginacja, zewnętrzny next, logout między kartami, odróżnienie permission denied od session expired i disabled registration UI. Sprawdzono też wyczyszczenie nonce/tożsamości z konsumowanego bootstrapu DOM.
- TEST_HMR=1 npm run test:e2e na stronie LocalWP: 6 PASS. Anonimowe bezpośrednie wejścia/refresh /app/, sites, sites/new i sites/123, stan rejestracji oraz HMR bez utraty emaila w formularzu. Testy te nie tworzą kont ani projektów strony.
- Oględziny zrzutów edytora desktopowego i listy mobilnej 390 px; brak poziomego overflow w sprawdzonych widokach — PASS.
- Przed zmianą strategii testy sprzątały losowe bazy. Od aktualizacji poniżej pozostaje jedna stała baza testowa. Istniejące konto administratora, projekt użytkownika i treści strony pozostawiono bez zmian. Rejestracja LocalWP pozostała wyłączona.

Testowy router poprawiono, aby delegował fizyczne katalogi (np. wp-admin/) do prawdziwego index.php zamiast testować stronę główną pod tym URL. Nie osłabiono zabezpieczeń aplikacji dla uzyskania PASS. Produkcyjny wariant działał na tymczasowym serwerze PHP, podczas gdy istniejący Vite strony nadal pracował. Log PHP testów nie zawierał ostrzeżeń/błędów.

## Pominięte kontrole i ograniczenia

PHPCS nie jest skonfigurowane i nie ma dostępnego polecenia phpcs; nie uruchomiono go. CI/workflow GitHub Actions nie jest skonfigurowane i nie zostało faktycznie uruchomione na GitHubie — brak CI PASS.

Reset hasła i weryfikacja emaila nie są wdrożone; wymagane przed publicznym startem. Panel nie pokazuje niedziałających linków do nich. Nie wdrożono płatności, publikacji, publicznych stron, RSVP, QR, uploadów, animacji ani szablonu urodzinowego.

Testowano Chromium oraz HTTP LocalWP, nie pełną macierz przeglądarek/HTTPS. Ostrzeżenie beforeunload zależy od przeglądarki i aktywacji użytkownika. Wykrywanie równoległej edycji tego samego projektu na różnych urządzeniach nie jest wdrożone (ostatni poprawny zapis wygrywa). Limity kont stosują bezpośredni REMOTE_ADDR; zaufane proxy/gateway i sprzątanie liczników przy innym modelu cron/cache wymagają oceny przed wdrożeniem publicznym. Kontekst CSRF wygasa po 30 minutach; po jego wygaśnięciu formularz prosi o odświeżenie strony.

Znane z poprzednich etapów: 10 moderate npm audit w drzewie ESLint/typescript-eslint, bez zmiany zależności i bez audit fix --force. Spec Kit nie jest zainstalowany (uv/specify niedostępne); plan i jedna lista zadań pozostają w Markdown. Wbudowany Browser wcześniej nie mógł się połączyć; weryfikację wykonano lokalnym Playwrightem.

## Następny etap

Etap 4: typ birthday-invitation, jego moduł edytora i pierwszy animowany renderer. Rejestry backendu i edytorów, wspólna powłoka zapisu i kontrakty są przygotowane do rozszerzenia. Na polecenie użytkownika przygotowano commit i push etapu 3.

## Aktualizacja: stała baza testowa

Zgodnie z preferencją użytkownika runner tworzy jedną bazę microsite_test_<hash-projektu> i używa jej ponownie. Czyści tylko własne tabele testowe przed przebiegiem; nie usuwa bazy i nie zmienia połączenia strony LocalWP. Trwały marker własności, porównanie z bazą strony, sprawdzenie prefiksu i blokada równoległego uruchomienia chronią przed pomyłką. Pierwszy przebieg i ponowny przebieg na tej samej bazie microsite_test_430601248a09bf6c: po 39 grup kontroli PASS. Próba wskazania bazy strony LocalWP została odrzucona przed operacją na bazie.
