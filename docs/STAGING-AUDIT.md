# Audyt stagingu — 2026-11-02

Raport końcowych wyników jest uzupełniany po aktualnej regresji. Wcześniejsze PASS nie są podstawą niniejszego audytu. Nie wykonano zewnętrznego wdrożenia. Konfiguracja, procedura instalacji i rollbacku: STAGING.md.

## Ustalenia i naprawy

- Build produkcyjny niepotrzebnie wywoływał WP-CLI, mimo że runtime URL pochodzą z WordPressa. Odczyt home pozostaje tylko dla Vite serve; produkcja używa względnych assetów.
- Zadeklarowane Node >=22.12 nie pokrywało engines ESLint 10. Minimalny build wymaga linii 22.13+ lub >=24; kontrolowane środowisko ma Node 26.0.0/npm 11.12.1.
- Błąd zapisu w dialogu podglądu był renderowany dwukrotnie. Powielony alert usunięto, a odpowiedni scenariusz wykonano ponownie.
- RSVP porównywał Origin z jawnie zapisanym portem domyślnym 443, choć przeglądarka go normalizuje. Naprawiono normalizację, zachowując ścisłą kontrolę originu i niedomyślnych portów. Test tego porównania nie jest testem TLS.
- Klient RSVP używa teraz credentials=same-origin, aby nie odrzucać uwierzytelnienia bramki hostingu. Uprawnienia gościa nadal zależą od sekretu/Origin, nie sesji WP. Weryfikacja ustawień konkretnej bramki pozostaje kontrolą stagingu. [Znaczenie Fetch credentials](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials).
- Paczka jest tworzona z allowlisty runtime, zachowuje kontrakty i loader CSS czytane przez PHP. Nie zawiera sekretów, bazy, core ani narzędzi developerskich.

## Konfiguracja i bezpieczeństwo

Runtime generuje URL z home_url/rest_url/plugin_dir_url albo bootstrapu WP. Trafienia localhost w zabezpieczeniu markera lokalnego Vite i ostrzeżeniu lokalnego linku są celowe. $schema HTTP i namespace SVG nie są fetchami sieciowymi. /Users i nazwa domeny LocalWP występują w historycznej dokumentacji, nie jako produkcyjne adresy runtime.

PHP: brak zewnętrznych zależności Composer. Migracje RSVP 1 / permissions 2 są idempotentne; wymagają InnoDB i advisory locks. Prywatne DTO/endpointy kontrolują sesję, nonce, capability i właściciela. CPT nie ma publicznej trasy core REST. Treść aplikacji jest plain text/JSX, a HTML serwerowy korzysta z escaping i JSON_HEX_*; nie używa dangerouslySetInnerHTML.

Preview sprawdza origin, source i kształt komunikatów, nie przekazuje nonce i nie wykonuje publicznych mutacji. Sesje i nonce pozostają w pamięci panelu; prywatny cache jest czyszczony przy zmianie konta. Publiczne linki są udostępnialne, nie służą ochronie prywatnych danych. Sekret RSVP znajduje się we fragmencie prywatnego linku i nagłówku API, w DB jest hash. Nie ma aplikacyjnego logowania haseł, cookies ani sekretów RSVP.

Warstwa PHP wysyła no-store/private dla panelu i API, no-store dla publicznych zaproszeń oraz zarządzania RSVP. Cache hostingu może to nadpisać; STAGING.md zawiera wymagane wyłączenia. Noindex nie jest zabezpieczeniem. Zamknięty staging wymaga ochrony hostingu i danych syntetycznych, z rejestracją wyłączoną.

## Kontrole wymagane po wdrożeniu

Rzeczywiste HTTPS/TLS/proxy, Secure cookies, CDN/cache, udostępnianie komunikatorami i QR na innym telefonie oraz fizyczne iOS/Android są nadal do wykonania. Lokalny runner używa HTTP, nie został przedstawiony jako pełny test HTTPS. PHPCS i CI nie są skonfigurowane i nie są PASS. Reset hasła, weryfikacja emaila i dostarczanie wiadomości są poza zakresem; blokują otwarte testy rejestracji, nie kontrolowany staging z kontami przygotowanymi przez administratora.
