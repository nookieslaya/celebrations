# Stan faktyczny — 2026-11-01

Etap 4 zakończony: wtyczka 0.4.0, birthday-invitation/schemaVersion 1 i birthday-party/templateVersion "1". Wersja szablonu jest stringiem zgodnym z dotychczasowym modelem. Pozostawiono istniejącą instancję Vite i konfigurację LocalWP. users_can_register nadal 0. Nie przełączano motywu i nie resetowano bazy strony.

## Działający zakres

Wspólne CRUD i konta pozostają bez przebudowy. Nowy kontrakt JSON i generowany BirthdayInvitationDraft obejmują solenizanta, opcjonalny wiek, treść, lokalną datę/godzinę, IANA, wyliczony UTC, miejsce/adres, opcjonalne szczegóły i trzy palety. Niekompletne szkice są dozwolone. Backend odrzuca gap/fold DST, nieprawidłową datę, strefę, wiek, paletę, HTML i nieznane pola. Po zapisie zwraca kanoniczny draft, bez ufania UTC klienta.

Nowy moduł edytora używa wspólnego odczytu/zapisu/dirty state. Preview invitation dla niezapisanych zmian wymaga Save and preview albo Cancel; błąd zapisu pozostawia formularz, nie otwiera starego szkicu. Prywatny HTML /app/sites/{id}/preview sprawdza sesję i własność, a wspólny GET sites/{id}/preview ponownie sprawdza uprawnienia, wersje i konfigurację. HTML nie zawiera danych projektu, podgląd ma no-store/private i noindex. Nie używa publicznego /s/ ani nonce w URL.

Renderer jest niezależny od routera/API/kont. GSAP 3.15.0 i CSS szablonu są w osobnym, dynamicznie ładowanym chunku. Login/lista/edytor nie pobierają go (sprawdzone żądaniami sieciowymi w produkcyjnym E2E). Sceny: świadome intro, reveal z wiekiem i pojedynczym konfetti, zaproszenie, szczegóły i closing/mapa. Naturalny scroll bez pin/scrub/wheel interception. Skip intro, stały skrót do szczegółów, focus i dekoracje aria-hidden. Reduced motion pokazuje komplet treści bez intro i konfetti. matchMedia/revert sprząta timeliny/ScrollTrigger; catch przywraca czytelne style po nieudanej inicjalizacji.

## Przykład do obejrzenia

http://celebrations.local/app/sites/8/preview — prywatny projekt Demo · Birthday party, właściciel: istniejący administrator ID 1. Trzeba zalogować się na uprawnione konto. Utworzono jeden przykład przez CLI i sprawdzono idempotencję ponownego uruchomienia; istniejące projekty nie były modyfikowane. To przykład do przeglądu, nie publiczna publikacja.

Nowy własny projekt: Create a site → Birthday invitation → birthday-party → uzupełnij pola → Save changes → Preview invitation. Reguły danych, czasu, renderera i skrypt demo: BIRTHDAY-INVITATION.md.

## Wykonane kontrole

- npm run verify: aktualność kontraktów, ESLint, TypeScript i produkcyjny build — PASS.
- php -l: 21 własnych plików PHP, w tym nowy normalizer, ochrona HTML i skrypt demo — PASS.
- Pełny npm run test:integration: 49 grup PASS na prawdziwym WordPressie i stałej bazie microsite_test_430601248a09bf6c. W tym 39 grup regresji wcześniejszych etapów i 10 grup etapu 4. Baza jest ponownie używana, nie tworzono nowej na każdy przebieg.
- Po końcowych korektach animacji/styli: TEST_SCOPE=birthday npm run test:integration — 10 grup PASS. Ten węższy przebieg nie jest raportowany jako ponowna pełna regresja.
- HTTP: typ/szablon, defaults bez daty/wieku, walidacja i brak zmian po błędzie, niezgodne szablony, gap London 2027-03-28 01:30, fold London 2027-10-31 01:30, błędna data kalendarza, UTC London/Kathmandu, historyczny offset z sekundami Asia/Kolkata 1900 oraz nadpisanie UTC klienta. Właściciel i administrator odczytują preview, klient B i anonimowy użytkownik nie odczytują. HTML B ma 404 i nie ujawnia treści. Skrypt demo jest idempotentny i zachowuje właściciela.
- Produkcyjne E2E: tworzenie z katalogu, pełna edycja/zapis/refresh, dirty preview z anulowaniem i nieudanym zapisem, keyboard open/focus, pojedyncze konfetti, shortcut details, intro/skip, ponowny mount/refresh i powrót, reduced motion, brak pustych sekcji i placeholder daty, kontrola braku żądań GSAP/chunku na loginie/liście/edytorze. Bez arbitralnych długich timeoutów animacji — asercje na stanie i widoczności.
- LocalWP/Vite: 7 anonimowych smoke/HMR testów PASS, łącznie z bezpośrednią prywatną trasą i odświeżeniem. Moduł renderera serwowany przez Vite zwraca HTTP 200. HMR formularza zachowuje wpisany email. Nie utworzono kont testowych na stronie LocalWP.
- Anonimowy odczyt przykładu LocalWP: 302 do loginu z bezpiecznym next, no-store/private, noindex. Rejestracja końcowo nadal wyłączona. Vite pozostaje uruchomiony.

## Weryfikacja wizualna

Obejrzano zapisane PNG: 375×812 / electric citrus, 768×1024 / pink noir, 1440×900 / cobalt pop, maksimum tekstów i 80-znakowe imię na 375 px oraz osobny kadr intro 1440×900. Wynik: czytelne sekcje i kontrasty, brak poziomego overflow w asercjach, brak pustych sekcji wieku/dress code oraz brak mapy przy pustym adresie. Po pierwszych oględzinach poprawiono łamanie imienia na całe słowa; ekstremalnie długie słowa mogą łamać się wewnętrznie. Render nie ucina skonfigurowanej treści.

Artefakty: wp-content/plugins/microsite-core/app/test-results/birthday/. Screenshoty treści robione są z reduced motion dla stabilnego układu. Intro jest osobnym kadrem normalnego trybu; drobne pozycje dekoracji mogą zależeć od chwili przechwycenia. Smoke tests mają oddzielny outputDir test-results/smoke, aby nie usuwać tych artefaktów. PNG są ignorowane przez Git.

## Ograniczenia i pominięte kontrole

To etap edycji i prywatnego podglądu, nie zaproszenie gotowe do sprzedaży. Publikacja, wersjonowane opublikowane snapshoty, RSVP, płatności, QR, uploady, muzyka i AI nie są wdrożone. Przed publicznym startem pozostają reset hasła i weryfikacja emaila.

Nie konfigurowano i nie uruchomiono PHPCS ani CI zgodnie z zakresem; brak GitHub Actions PASS. Weryfikowano Chromium, nie pełną macierz Safari/Firefox/mobile hardware. Brak osobnego automatycznego testu hot refresh samego modułu GSAP; cleanup opiera się na cyklu React i oficjalnym matchMedia/revert, a wykonane testy HMR obejmują panel. Nie wykonano osobnego wstrzykiwania błędu inicjalizacji GSAP; ścieżka fail-open jest zaimplementowana, bez deklarowania testu PASS dla niej.

Testy używają wersji stref serwera i Intl przeglądarki. Nie zamrażamy tzdb; preview normalizuje czas według aktualnych reguł. Powtarzającą się godzinę trzeba zmienić, nie ma wyboru pierwszego/drugiego wystąpienia. Zakres kalendarza: 1900–2200. Minimalna deklaracja PHP/WP pozostaje bez pełnej macierzy wersji. Nadal istnieje znany dług npm audit (10 moderate w narzędziach lintujących), bez audit fix --force. Spec Kit pozostaje w wariancie Markdown.

Nie ma blokad realizacji tego etapu. Zmiany etapu 4 pozostają lokalne, bez automatycznego commita/push.
