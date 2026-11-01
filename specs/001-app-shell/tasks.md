# Zadania — jedyne źródło prawdy

## Etap 1

- [x] Inspekcja instalacji, narzędzi i istniejącej zawartości.
- [x] Wtyczka i opcjonalny, nieaktywowany motyw.
- [x] React/TypeScript/Vite i routing /app/*.
- [x] Potwierdzić kontrolami produkcję, bezpośrednie wejścia i odświeżanie.
- [x] Potwierdzić development i HMR z zachowaniem stanu.
- [x] Uzupełnić wyniki w STATUS.md.

## Etap 2 — backend szkiców

- [x] Prywatny CPT, capabilities i idempotentna rola klienta.
- [x] Rejestr basic-page/basic, wspólny kontrakt JSON i generowane typy TS.
- [x] Walidacja, repozytorium, serwis i autoryzacja własności.
- [x] REST catalog i CRUD szkiców z paginacją i ochroną sesji.
- [x] Typowany klient API bez wdrażania logowania i kreatora.
- [x] Testy integracyjne HTTP na izolowanej bazie z bezpiecznikiem.
- [x] Kontrole PHP, kontraktów, lint, typecheck, build i regresji panelu.
- [x] Aktualizacja dokumentacji i faktycznych wyników.

## Etap 3 — konta i panel

- [x] Bootstrap sesji/nonce, ochrona CSRF i limity endpointów kont.
- [x] Rejestracja respektująca konfigurację WP i ochrona administracji klienta.
- [x] Router, widoki kont i prywatny stan klienta API.
- [x] Lista, katalog i tworzenie projektu bez powielania POST.
- [x] Rejestr edytorów, edycja basic-page, zapis, lokalny podgląd i ochrona zmian.
- [x] Rzeczywiste testy HTTP kont/sesji/CSRF oraz E2E na izolowanej bazie i produkcyjnym buildzie.
- [x] PHP, kontrakty, lint, typecheck, build i regresja; faktyczny status PHPCS/CI.
- [x] Dokumentacja i raport etapu 3.

## Usprawnienie testów po etapie 3

- [x] Stała dedykowana baza, marker własności i blokada współbieżności.
- [x] Pierwszy przebieg oraz ponowne użycie tej samej bazy.

## Etap 4 — zaproszenie urodzinowe i prywatny podgląd

- [x] Kontrakt birthday-invitation i rejestr birthday-party; defaults i typy TS.
- [x] Daty/strefy IANA i odrzucanie nieistniejących/niejednoznacznych godzin DST.
- [x] Moduł edytora, palety, liczniki i zapis przed podglądem.
- [x] Prywatny routing i walidowany odczyt podglądu z kontrolą właściciela.
- [x] Niezależny, lazy-loaded renderer GSAP, sceny, cleanup i reduced motion.
- [x] Integracja HTTP/E2E i regresja na stałej bazie testowej.
- [x] Screenshoty i oględziny 375×812, 768×1024, 1440×900 oraz długich tekstów.
- [x] Kontrole jakości, dokumentacja i wyniki.

## Dalsze etapy
- [ ] PHPCS i CI, prywatny podgląd basic-page.
- [ ] Media, publikacja i snapshoty; później płatności, RSVP i QR jako osobne moduły.
