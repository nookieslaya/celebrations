# Stan faktyczny — 2026-11-01

Etap 1 dostarczony. Wtyczka microsite-core jest aktywna. Adresy: http://celebrations.local/app/ oraz http://celebrations.local/app/sites. Zostawiono działający build produkcyjny; Vite jest zatrzymany, marker usunięty. Aktywny motyw pozostaje twentytwentyfive. Zachowano istniejące wpisy/strony i bazę; jedyne zmiany konfiguracyjne WP to aktywacja wtyczki i odświeżenie reguł rewrite.

## Wykonane kontrole

- PHP 8.4.27 LocalWP: php -l dla wszystkich pięciu własnych plików PHP — PASS.
- npm run verify: ESLint, TypeScript, Vite build — PASS.
- Playwright produkcja bez Vite: bezpośrednie wejście i refresh obu adresów, nawigacja i stan React — 3 PASS. Test HMR w tym trybie jest jawnie pomijany.
- Playwright z Vite i TEST_HMR=1: oba adresy/refresh, nawigacja i HMR — 4 PASS. Zmiana komponentu zachowuje notatkę i nie nawiguje dokumentu. Pierwsze próby wykryły problem ze wspólnym entrypointem/komponentem; po rozdzieleniu i restarcie runtime test przeszedł.
- Zatrzymanie Vite ujawniło pozostający marker development; dodano sprzątanie SIGINT/SIGTERM i sprawdzono ponownie start/zatrzymanie. Po poprawce końcowe testy produkcyjne: 3 PASS, 1 celowo pominięty test HMR.
- Osobna kontrola produkcji w Chromium: konfiguracja production, assety manifestu, brak żądań do loopback Vite — PASS.
- Oględziny zrzutów 1440 px i 390 px, kontrola braku overflow poziomego na mobile — PASS.

## Ograniczenia

Wbudowany Browser nie mógł się połączyć: „privileged native pipe bridge is not available; browser-client is not trusted”. Użyto lokalnego Playwright Chromium.

Spec Kit: uv/specify nie są dostępne, konfiguracja nie istniała. Sprawdzono oficjalny README i integrację Codex; użyto dozwolonego fallbacku Markdown. Jedyna lista zadań: specs/001-app-shell/tasks.md.

npm audit: 10 wpisów moderate wynikających z minimatch <11.0.1 w drzewie ESLint/typescript-eslint. Dotyczy zależności development; npm proponuje niekompatybilne downgrade'y narzędzi. Nie wykonano audit fix --force. Wymaga ponownej oceny przy etapie CI i aktualizacji zależności. Produkcyjne zależności React nie są objęte tym raportem.

Nie uruchomiono testów integracyjnych PHP, PHPCS, Vitest ani CI; nie skonfigurowano ich w tym ograniczonym etapie. Nie ma logiki domenowej do testów jednostkowych. HTTPS development nie był testowany. Nie aktywowano microsite-shell; jego składnia PHP została sprawdzona, panel zweryfikowano pod istniejącym motywem.

Następny krok: narzędzia i odizolowana baza testowa, potem konta/sesje oraz uniwersalny model Site/basic-page. Animowany szablon urodzinowy dopiero po wspólnym silniku. Nie wdrożono logowania, projektów, płatności ani zaproszeń.

## Czytelność kodu

Rozpisano HTML/PHP/JSX, CSS i konfigurację na czytelne bloki. Zasadę zapisano w AGENTS.md. Po zmianach: php -l dla pięciu własnych plików — PASS; npm run verify — PASS; E2E produkcyjne — 3 PASS, HMR jawnie pominięty (Vite zatrzymany).
