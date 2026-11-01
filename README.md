# Microsites — LocalWP, etapy 1–4

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

`verify` sprawdza również aktualność wygenerowanych kontraktów, ESLint, TypeScript i build. Testy E2E są tylko odczytowe wobec WP i nie resetują bazy. Składnię PHP sprawdź `php -l` dla własnych plików PHP. Testy integracyjne uruchom poleceniem `npm run test:integration`; wymagają uprawnień do osobnej bazy testowej tworzonej tylko przy pierwszym uruchomieniu. Szczegóły i bezpieczniki: [docs/TESTING.md](docs/TESTING.md). PHPCS i CI pozostają kolejnym etapem narzędziowym.

Zweryfikowane środowisko: PHP LocalWP 8.4.27, WP-CLI 2.12.0, Composer 2.8.6, MySQL LocalWP 8.4.0, Node 26.0.0, npm 11.12.1. WordPress 7.1.4. Minimalne PHP 8.2 / WP 6.6 są deklaracją kompatybilności, nie pełną macierzą testów. Zależności przypięte w package.json i package-lock.json: React 19.3.1, Vite 8.3.5, TypeScript 6.0.3 (zgodny z typescript-eslint; TS 7 odrzucony przez peer dependencies).

Struktura: `includes/` — routing PHP, `templates/` — dokument panelu, `app/src/` — React, `app/tests/` — E2E, `wp-content/themes/microsite-shell/` — opcjonalny motyw, `docs/` — decyzje, `specs/001-app-shell/` — zakres/plan/jedyna lista zadań.

HMR można sprawdzić automatycznie: uruchom `npm run dev`, a w drugim Open site shell w katalogu app wykonaj `TEST_HMR=1 WP_SITE_URL="$(wp option get home)" npm run test:e2e`. Test chwilowo zmienia tekst w `src/views/AuthView.tsx` i przywraca plik w finally; nie edytuj tego pliku podczas testu. Po zmianie samego entrypointu lub preamble uruchom ponownie Vite, żeby odtworzyć spójny runtime React Refresh.

## Backend etapu 2

Wtyczka rejestruje prywatne szkice ms_site, rolę microsite_customer oraz `/wp-json/microsites/v1/catalog` i chronione CRUD `/sites`. Nie musisz reaktywować wtyczki: uprawnienia konfigurowane są idempotentnie przy aktualizacji kodu. Panel ma logowanie, rejestrację zgodną z ustawieniem WP, listę projektów i edytor basic-page. Bootstrap sesji/nonce jest generowany przez WordPress przy żądaniu dokumentu.

- [Kontrakt API i przykładowe JSON](docs/API.md)
- [Architektura i model danych](docs/ARCHITECTURE.md)
- [Dodawanie typu i szablonu](docs/ADDING-A-SITE-TYPE.md)
- [Testy i izolacja bazy](docs/TESTING.md)

Kontrakty: `npm run contracts:generate`, kontrola: `npm run contracts:check` (również w verify). Integracja: `npm run test:integration` z Open site shell w katalogu app. Testowe konta powstają wyłącznie w tymczasowej bazie i są czyszczone przed kolejnym przebiegiem; baza pozostaje do ponownego użycia. Nie tworzymy kont klientów ani szkiców testowych na stronie LocalWP.

## Konta i panel — etap 3

Widoki pod aktualnym home URL: /app/login, /app/register, /app/sites, /app/sites/new i /app/sites/{id}. /app/ wybiera login lub projekty zgodnie z sesją. Konto klienta nie widzi admin bara i trafia z wp-admin do panelu; administrator zachowuje dostęp.

Na tej stronie LocalWP rejestracja była wyłączona i tak pozostało. Panel pokazuje Registration is currently closed. Jeśli chcesz ją świadomie włączyć, jako administrator wybierz WordPress → Settings → General → Membership → Anyone can register, albo wykonaj z Open site shell `wp option update users_can_register 1`. Wyłączenie: `wp option update users_can_register 0`. Backend zawsze przypisuje nowym kontom rolę klienta. Nie zmienialiśmy tej opcji automatycznie.

Logowanie wymaga emaila i hasła istniejącego konta WP. Nowe hasło: 12–128 bajtów oraz potwierdzenie. Po rejestracji konto jest zalogowane. Cookies są natywne; tokeny nie są zapisywane w localStorage. Publiczne operacje kont wymagają kontekstu CSRF i originu strony, a nie współdzielonego nonce anonimowego użytkownika. Szczegóły: docs/API.md i docs/ARCHITECTURE.md.

Edytor zapisuje dopiero po Save changes i przesyła pełny draft. Błąd zachowuje formularz; wyjście z niezapisanymi zmianami wymaga potwierdzenia. Podgląd jest lokalny, strona nie jest publikowana. Reset hasła i weryfikacja emaila nie istnieją i są wymagane przed publicznym startem. Nie ma niedziałających linków do tych funkcji.

`npm run test:integration` obejmuje także produkcyjne E2E kont i panelu na jednej stałej, osobnej bazie testowej. Zainstaluj przeglądarkę testową przez `npx playwright install chromium`. Istniejący Vite nie jest zatrzymywany. `npm run test:e2e` na stronie LocalWP wykonuje tylko anonimowe smoke tests; pełne konta/projekty są testowane wyłącznie w izolowanym runnerze.

## Birthday invitation — etap 4

W Create a site wybierz Birthday invitation / birthday-party. Edytor ma sekcje celebrant, invitation, date & location, additional details i appearance. Preview invitation otwiera prywatny, zapisany szkic pod /app/sites/{id}/preview. Niezapisane zmiany wymagają Save and preview lub Cancel. Nie ma publikacji ani płatności.

Przykładowy projekt i daty/strefy/animacje: [docs/BIRTHDAY-INVITATION.md](docs/BIRTHDAY-INVITATION.md). GSAP 3.15.0 jest ładowany wyłącznie dla tego szablonu, bez CDN. Pełny zestaw testów nadal działa przez npm run test:integration na stałej bazie; szybki zakres birthday: TEST_SCOPE=birthday npm run test:integration. Screenshoty: wp-content/plugins/microsite-core/app/test-results/birthday.

Przykład utworzony lokalnie dla istniejącego administratora: http://celebrations.local/app/sites/8/preview (projekt Demo · Birthday party). Wymaga logowania; nie jest publicznym zaproszeniem. Skrypt tworzący przykład jest idempotentny i opisany w dokumentacji etapu 4.

## Etap 5 — publikacja

Edytor obsługuje publikację, osobny snapshot, wycofanie, link i QR SVG/PNG. Każdy projekt wymaga jawnego prawa nadanego przez administratora; nie ma płatności. Szczegóły i komendy z LocalWP Open site shell: [docs/PUBLICATION.md](docs/PUBLICATION.md). Publiczne /s/{publicId}/ zawsze używa builda produkcyjnego, dlatego wykonaj npm run build także przy działającym Vite. Lokalny link nie jest dostępny dla gości przez Internet.

## Etap 6 — RSVP

Birthday invitation ma opcjonalne RSVP: konfiguracja w edytorze → zapis → aktualizacja publikacji. Odpowiedzi organizatora: /app/sites/{id}/responses. Gość nie potrzebuje konta i otrzymuje prywatny link do swojej odpowiedzi. [docs/RSVP.md](docs/RSVP.md) opisuje czas, sekrety, idempotencję, usuwanie i ograniczenia. Starsze projekty/snapshoty pozostają z wyłączonym RSVP.
