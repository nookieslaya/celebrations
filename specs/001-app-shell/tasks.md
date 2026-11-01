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

## Etap 5 — publikacja i udostępnianie

- [x] Osobny snapshot, atomowy stan/data, stabilny URL i blokada współbieżności.
- [x] Centralne prawo projektu, CLI grant/revoke, kontrola sesji i właściciela.
- [x] Gotowość w rejestrze, błędy pól, brak wpływu na zapis szkicu.
- [x] Chronione komendy REST i prywatny DTO publikacji.
- [x] Publiczna powłoka bez kont/Vite, wspólne renderery birthday i basic.
- [x] Edytor: save-and-publish/cancel, aktualizacja i potwierdzane wycofanie.
- [x] Kopiowanie/share i QR SVG/PNG na żądanie, ostrzeżenie LocalWP.
- [x] Metadane snapshotu, noindex/no-store, katalog i zasady przyszłych SVG.
- [x] Pełna regresja HTTP/E2E: 57 grup PASS, test błędu zapisu/blokady i przegląd dwóch rozmiarów.
- [x] Końcowy STATUS i przykład opublikowanej strony LocalWP.

## Etap 6 — RSVP bez konta gościa

- [x] Opcjonalny kontrakt RSVP birthday, boolean TS i zgodność starszych danych.
- [x] Deadline UTC przez istniejący mechanizm IANA/DST oraz zależność od daty wydarzenia.
- [x] Wersjonowane, idempotentne tabele i indeksy; usunięcie projektu sprząta odpowiedzi.
- [x] Tworzenie i zarządzanie przez hash sekretu, oddzielna powłoka i fragment URL.
- [x] Idempotencja, unikalność DB, znacznik usuniętej operacji i wygasanie kluczy.
- [x] Limit requestu, typów, honeypot, rate limiting i same-origin bez wildcard CORS.
- [x] Formularz publiczny i konfiguracja wyłącznie z opublikowanego snapshotu.
- [x] Panel organizatora: statystyki, lista, filtr, paginacja i potwierdzane usunięcie.
- [x] HTTP/E2E: 68 grup PASS, produkcja, mobile/desktop, klawiatura i oględziny; 8 smoke/HMR PASS.
- [x] Dokumentacja, faktyczne wyniki i przykład LocalWP.

## Dalsze etapy

- [ ] PHPCS i CI, prywatny podgląd basic-page.
- [ ] Płatności, media/uploady i jawna integracja sprawdzonych assetów jako oddzielne moduły.
