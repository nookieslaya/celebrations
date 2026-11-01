# Testy backendu i bezpieczniki bazy

W LocalWP wybierz **Open site shell** i przejdź do `wp-content/plugins/microsite-core/app` istniejącej strony. Node musi być dostępny w tej powłoce.

```sh
npm ci
npm run verify
npm run test:integration
WP_SITE_URL="$(wp option get home)" npm run test:e2e
```

Testy integracyjne używają Playwright APIRequestContext i asercji Node do wykonywania rzeczywistych żądań HTTP na prawdziwym WordPressie i MySQL LocalWP. Nie jest to mock ani wewnętrzny dispatch. Użytkownicy logują się przez standardowy wp-login.php; fixture nonce jest kopiowany wyłącznie do katalogu mu-plugins tymczasowej instalacji i wymaga zalogowanej sesji oraz stałej MICROSITE_INTEGRATION_TEST i prefiksu testowej bazy. Fixture nie jest ładowany przez wtyczkę strony.

Testowy WP_ENVIRONMENT_TYPE=development wyłącza lokalny marker assetów, więc testy sprawdzają także produkcyjny manifest i obie ścieżki panelu przy nadal działającym Vite strony.

Runner wymaga działających WP-CLI, PHP i klienta MySQL z Open site shell oraz uprawnień utworzenia/usunięcia osobnej bazy. Nie pobiera i nie instaluje ponownie core strony. Kopiuje istniejący core i motywy do systemowego katalogu tymczasowego; instaluje WordPressa wyłącznie tam i wyłącznie na nowej bazie `microsite_test_<losowy-sufiks>`. Losowy port PHP wybierany jest automatycznie i nie koliduje z Vite. Nie instaluje żadnych kontenerów ani nowej usługi MySQL.

Połączenie z MySQL pochodzi z konfiguracji strony, ale DB_NAME jest nowy. Socket jest wykrywany z konfiguracji mysqli w aktywnym PHP, bez hardkodowanych ścieżek. Lokalny auto_prepend/auto_append LocalWP jest wyłączany wyłącznie w procesie testowego serwera PHP, aby uniknąć dwukrotnego wykonania Local bootstrap przy routerze CLI.

## Ochrona danych

Przed jakąkolwiek instalacją lub modyfikacją runner porównuje testową DB_NAME z DB_NAME strony i odrzuca zgodność; wymaga prefiksu microsite_test_ i świeżej nazwy. Istniejąca baza, nawet testowa, powoduje odmowę. Przed poleceniami WP ponownie sprawdza konfigurację i prywatny marker własności w katalogu tymczasowym. Usuwana jest wyłącznie baza utworzona przez ten przebieg. Brak resetów lub czyszczenia bazy LocalWP.

Można jawnie wskazać nową nazwę przez TEST_DB_NAME; nie można w ten sposób podstawić bazy strony. Sam bezpiecznik można sprawdzić bez tworzenia bazy:

```sh
TEST_DB_NAME="$(wp config get DB_NAME)" node ../tests/run-integration.mjs --guard-only
```

Oczekiwany wynik: odmowa z niezerowym kodem. Dla nowej nazwy microsite_test_... --guard-only tylko sprawdza nazwę i niczego nie tworzy. Nie udostępniamy komendy resetu istniejącej bazy.

Runner sprząta po sukcesie i zwykłym błędzie. Po wymuszonym zabiciu procesu może pozostać baza testowa i katalog tymczasowy; kolejny przebieg ich nie usuwa i tworzy nową nazwę. Ewentualne ręczne sprzątanie wymaga sprawdzenia nazwy, markera i konfiguracji — nigdy nie należy kierować resetu na DB_NAME strony.

## Pokrycie

Sprawdzane są: defaults i backendowe wersje, właściciel sesji, unikalne publicId, własna lista i paginacja, anonimowy dostęp, obustronna izolacja A/B, niezależne capabilities, administrator z jawnym uprawnieniem, brak/błędny nonce przez cookies (POST/PATCH), poprawny odczyt i edycja, zakazane pola systemowe, limity i pełna walidacja draft, brak zmian po nieudanej walidacji, konflikty zapisanych wersji, brak publicznego/default REST ujawnienia CPT, idempotentne role i brak diagnostyki PHP.

`npm run verify` obejmuje sprawdzanie wygenerowanego kontraktu, ESLint, TypeScript i build. PHPCS/CI nie zostały jeszcze dodane; składnia PHP jest sprawdzana przez php -l. E2E panelu zachowują dotychczasowe testy obu tras i nawigacji. Test HMR jest uruchamiany tylko jawnie przy TEST_HMR=1.
