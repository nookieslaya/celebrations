# Stan faktyczny — 2026-11-01

Etap 5: wtyczka 0.5.0. Publikacja, publiczny renderer i udostępnianie są wdrożone. Pozostawiono istniejącą instancję Vite, aktywny motyw i konfigurację LocalWP. users_can_register nadal 0. Nie resetowano bazy strony; testy ponownie używają microsite_test_430601248a09bf6c.

## Działający zakres

Oddzielny opublikowany snapshot zawiera wyłącznie treść, wygląd i tożsamość typu/szablonu/wersji. Jest zapisywany razem ze stanem i datą w jednym wpisie meta, pod blokadą MySQL. Zapis szkicu nie zmienia publicznej strony. Hash konfiguracji wykrywa nieopublikowane zmiany; nazwa projektu i updatedAt nie zastępują porównania treści. Wycofanie daje 404, zachowując szkic i publicId. Ponowna publikacja używa tego samego URL, a identyczne retry nie zmienia daty aktywnej publikacji.

Publication jest centralnym serwisem uprawnień dla administratora i przyszłych płatności. Domyślnie projekt nie ma prawa publikacji. Capability, dostęp do projektu i osobne prawo są sprawdzane łącznie. Klient nie ustawia prawa przez API. Administrator nadaje/odbiera prawo przez CLI. Odebranie blokuje aktualizacje, ale nie wycofuje strony i nie blokuje szkicu ani wycofania przez właściciela.

Gotowość korzysta z JSON Schema i list wymaganych ścieżek w Catalog, bez kopii kontraktu. Niepełny szkic można zapisać, ale brak wymaganych danych daje błędy konkretnych pól przy publikacji. Nie ma automatycznego wyłączenia po wydarzeniu.

Publiczne /s/{publicId}/ ma osobny dokument i entry produkcyjny. Współdzieli renderer birthday-party i basic-page z prywatnym preview, bez kopiowania animacji. Nie ładuje panelu, kont, nonce, prywatnego API ani Vite. Metadane i canonical pochodzą ze snapshotu. Publiczny odczyt nie przelicza ponownie zamrożonego UTC. No-store oraz noindex/nofollow/noarchive, prywatny CPT poza sitemap.

Edytor obsługuje Publish/Update live page, zapis przed publikacją z anulowaniem, potwierdzane wycofanie, stan zmian, datę i powód blokady. Błąd zapisu nie uruchamia publikacji. Kopiowanie/Web Share i QR SVG/PNG są dostępne wyłącznie dla opublikowanego projektu. qrcode 1.5.4 jest importowane dopiero na żądanie, bez zewnętrznego generatora. LocalWP pokazuje ostrzeżenie o lokalnym linku.

## Przykład LocalWP

http://celebrations.local/s/61b486f3910b58960165852293f4eefa/

Opublikowano istniejący projekt demonstracyjny ID 8 (Demo · Birthday party), właściciel: istniejący administrator ID 1. Nie zmieniano treści innych projektów. Edytor: http://celebrations.local/app/sites/8. Anonimowy Chromium potwierdził HTTP 200, widocznego Alex Morgan, zero cookies i zero żądań do Vite/prywatnego API/panelu.

Prawo projektu z LocalWP → Open site shell:

```sh
wp microsite publication-right 8 grant --user=1
wp microsite publication-right 8 revoke --user=1
```

## Weryfikacja

- npm run verify: aktualne kontrakty, ESLint, TypeScript i produkcyjny build obu entry — PASS.
- php -l: 23 własne pliki PHP — PASS. git diff --check — PASS.
- TEST_SCOPE=publication npm run test:integration: 8 grup PASS na rzeczywistym WordPressie i tej samej stałej bazie testowej.
- Końcowy wspólny npm run test:integration: 57 grup PASS (49 grup regresji etapów 2–4 i 8 grup publikacji). Rzeczywiste sesje HTTP, produkcyjny build, bez diagnostyki PHP. Ta sama stała baza testowa zachowana po przebiegu.
- LocalWP: 7 anonimowych smoke/HMR testów PASS, bez tworzenia kont/danych na stronie. Bezpośrednie trasy i odświeżenia, działający HMR z zachowaniem formularza. Vite pozostaje uruchomiony.
- Nowe HTTP/E2E: brak prawa/escalation/CLI, sesje i nonce, własność A/B, niekompletność i Unicode whitespace, snapshot i metadata, izolacja szkicu, save/cancel/failed save, aktualizacja, stabilny publicId/URL, wycofanie i republish, odebranie prawa, publiczny odczyt bez cookies/Vite, basic-page i 404.
- Pobrano rzeczywiste SVG i PNG z panelu, zrasteryzowano w Chromium i zdekodowano jsqr 1.4.0: oba wyniki są dokładnie równe backendowemu publicUrl.
- Drugie połączenie MySQL zajmuje blokadę: komenda zwraca publication_busy. Wstrzyknięty błąd update_post_metadata: storage_error, poprzedni pełny snapshot bez zmian. Następny prawidłowy publish działa.

## Wygląd i assety

Obejrzano PNG sekcji publikacji przy viewportach 375×900 i 1440×900: czytelne stany/link, zawijające się akcje i brak poziomego overflow (także asercja przeglądarki). Artefakty: app/test-results/publication/. Zachowano osobne katalogi birthday i smoke, bez commitowania builda i artefaktów.

Folder przyszłych grafik: /Users/radek/Local Sites/celebrations/app/public/wp-content/plugins/microsite-core/app/src/assets/birthday-party/svg/. Znalezione trzy SVG zachowano bez zmian; przygotowano .gitkeep i README z zasadami przeglądu, inline/data-part/scoped selectors/--asset-*. Nie podłączono ich do renderera ani nie zmieniano dekoracji/animacji.

## Ograniczenia

LocalWP nie jest publicznym hostingiem. Link można przekazywać dalej; random ID i noindex nie stanowią kontroli dostępu. Nie ma kodów dostępu ani indywidualnych zaproszeń. Zewnętrzne komunikatory mogą zachować stare podglądy mimo aktualnej odpowiedzi serwera.

Nie wdrożono RSVP, płatności, uploadów, domen własnych, historii publikacji ani konfliktów równoległej edycji szkicu. Kolejny etap: RSVP bez konta gościa. Przed publicznym startem pozostają reset hasła i weryfikacja emaila. Publiczna powłoka wymaga npm run build także podczas pracy panelu z HMR.

Nie uruchamiano PHPCS/CI ani pełnej macierzy Safari/Firefox/urządzeń fizycznych. Nie sprawdzono natywnego systemowego okna Web Share na telefonie. Dotychczasowe ograniczenia GSAP/tzdb z etapu 4 pozostają: brak osobnego testu HMR modułu GSAP i wstrzyknięcia błędu jego inicjalizacji; brak pełnej macierzy PHP/WP. npm audit nadal zgłasza 10 moderate w narzędziach lintujących; brak wymuszonej aktualizacji zależności. Istniejące wersje pakietów zachowano, dodano tylko przypięte zależności QR/dekodera.

Szczegóły architektury, API i CLI: [PUBLICATION.md](PUBLICATION.md). Zmiany pozostają lokalne, bez automatycznego commita/push.
