# Microsites — LocalWP, etapy 1–2

Wtyczka dostarcza niezależny od motywu panel React pod `/app/` i `/app/sites`. Motyw microsite-shell jest opcjonalny; panel działa niezależnie od aktywnego motywu.

## Uruchomienie na istniejącej stronie

1. Uruchom stronę w LocalWP i wybierz **Open site shell**. Przejdź do katalogu `app/public` tej strony.
2. Umieść kod repozytorium w tym katalogu (repozytorium nie zawiera WordPress core ani bazy). Dla czystego klona najpierw utwórz osobną stronę przez LocalWP, a następnie skopiuj własny kod do jej `app/public`. Nigdy nie instaluj ponownie istniejącej strony.
3. `cd wp-content/plugins/microsite-core/app` i `npm ci`.
4. `npm run build`.
5. Z katalogu public: `wp plugin activate microsite-core`. Aktywacja odświeża reguły tylko przez WordPress, bez nadpisywania konfiguracji serwera. Przy już aktywnej wtyczce po zmianie reguł: `wp rewrite flush`.
6. `wp option get home` podaje origin; otwórz `<home>/app/` i `<home>/app/sites`.

## Development

W Open site shell, w katalogu app: `npm run dev`. Vite odczytuje URL strony przez WP-CLI i zapisuje ignorowany `.vite-dev.json` z przydzielonym portem. Dokument i API nadal pochodzą z WordPressa. CORS dopuszcza wyłącznie origin strony. Nie otwieraj panelu pod portem Vite.

Marker jest używany wyłącznie przy `wp_get_environment_type() === 'local'` (LocalWP już ustawia tę wartość). Jeśli WP-CLI nie jest na PATH, skopiuj `.env.example` do `.env.local` i ustaw rzeczywisty `WP_SITE_URL`. Nie zmieniaj home/siteurl w bazie.

Dla lokalnego HTTPS potrzebny jest zaufany certyfikat Vite i konfiguracja HTTPS/WSS w vite.config.ts; obecny development zweryfikowano na HTTP LocalWP. Nie wyłączaj zabezpieczeń przeglądarki.

## Produkcyjny build

Zatrzymaj Vite przez Ctrl+C; upewnij się, że `.vite-dev.json` nie istnieje. Po wymuszonym zabiciu procesu usuń go ręcznie: `rm -f .vite-dev.json` (z katalogu app). Uruchom `npm run build`. Wtyczka czyta `dist/.vite/manifest.json` i ładuje pliki z własnego katalogu, bez serwera Node. Brak buildu zwraca kontrolowany HTTP 503. Build nie jest commitowany; musi powstać przed wdrożeniem i zostać dołączony do paczki wtyczki.

## Weryfikacja

W katalogu app, w Open site shell:

```sh
npm run verify
npx playwright install chromium
WP_SITE_URL="$(wp option get home)" npm run test:e2e
```

`verify` sprawdza również aktualność wygenerowanych kontraktów, ESLint, TypeScript i build. Testy E2E są tylko odczytowe wobec WP i nie resetują bazy. Składnię PHP sprawdź `php -l` dla własnych plików PHP. Testy integracyjne uruchom poleceniem `npm run test:integration`; wymagają uprawnień do osobnej, nowej bazy. Szczegóły i bezpieczniki: [docs/TESTING.md](docs/TESTING.md). PHPCS i CI pozostają kolejnym etapem narzędziowym.

Zweryfikowane środowisko: PHP LocalWP 8.4.27, WP-CLI 2.12.0, Composer 2.8.6, MySQL LocalWP 8.4.0, Node 26.0.0, npm 11.12.1. WordPress 7.1.4. Minimalne PHP 8.2 / WP 6.6 są deklaracją kompatybilności, nie pełną macierzą testów. Zależności przypięte w package.json i package-lock.json: React 19.3.1, Vite 8.3.5, TypeScript 6.0.3 (zgodny z typescript-eslint; TS 7 odrzucony przez peer dependencies).

Struktura: `includes/` — routing PHP, `templates/` — dokument panelu, `app/src/` — React, `app/tests/` — E2E, `wp-content/themes/microsite-shell/` — opcjonalny motyw, `docs/` — decyzje, `specs/001-app-shell/` — zakres/plan/jedyna lista zadań.

HMR można sprawdzić automatycznie: uruchom `npm run dev`, a w drugim Open site shell w katalogu app wykonaj `TEST_HMR=1 WP_SITE_URL="$(wp option get home)" npm run test:e2e`. Test chwilowo zmienia tekst w `src/App.tsx` i przywraca plik w finally; nie edytuj tego pliku podczas testu. Po zmianie samego entrypointu lub preamble uruchom ponownie Vite, żeby odtworzyć spójny runtime React Refresh.

## Backend etapu 2

Wtyczka rejestruje prywatne szkice ms_site, rolę microsite_customer oraz `/wp-json/microsites/v1/catalog` i chronione CRUD `/sites`. Nie musisz reaktywować wtyczki: uprawnienia konfigurowane są idempotentnie przy aktualizacji kodu. Panel nie ma jeszcze logowania ani integracji CRUD. Typowany klient API wymaga nonce od modułu sesji, który powstanie w etapie 3.

- [Kontrakt API i przykładowe JSON](docs/API.md)
- [Architektura i model danych](docs/ARCHITECTURE.md)
- [Dodawanie typu i szablonu](docs/ADDING-A-SITE-TYPE.md)
- [Testy i izolacja bazy](docs/TESTING.md)

Kontrakty: `npm run contracts:generate`, kontrola: `npm run contracts:check` (również w verify). Integracja: `npm run test:integration` z Open site shell w katalogu app. Testowe konta powstają wyłącznie w tymczasowej bazie i są usuwane razem z nią. Nie tworzymy kont klientów ani szkiców testowych na stronie LocalWP.
