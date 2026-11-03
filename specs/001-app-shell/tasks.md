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

## Etap wizualny — Birthday Celebration (płatności odłożone)

- [x] Research źródeł/licencji oraz lokalne, zoptymalizowane fonty.
- [x] Nowy szablon v1 i trzy palety; zachowanie birthday-party oraz istniejących projektów.
- [x] Wspólny edytor i defaults/restrykcje palet według szablonu.
- [x] Cover/reveal/hero/story/details/RSVP/closing i choreografia GSAP.
- [x] Dekoracje SVG/Canvas, pauza/visibility/intersection i reduced motion.
- [x] Integracja prawdziwego RSVP bez duplikacji logiki.
- [x] Osobny, idempotentny przykład LocalWP i lokalna publikacja.
- [x] Test nowego zakresu oraz StrictMode/HMR/cleanup/fail-open.
- [x] Końcowa regresja: 73 grupy PASS; 8 smoke/HMR PASS, oględziny macierzy i zapis wyników.
- [x] Dokumentacja i artefakty do przeglądu, w tym 4.52s nagranie otwarcia.

## Dopracowanie Birthday Celebration — koperta, konfetti i fotografia

- [x] Obejrzenie wcześniejszego renderu, źródeł Realistic Look i pliku fotografii/licencji.
- [x] canvas-confetti 1.9.4: emisje z dwóch stron, palety, reset i reduced motion.
- [x] Lokalna srebrna fotografia kuli, maskowanie i spokojny ruch.
- [x] Warstwowa koperta i jedna choreografia GSAP closed/opening/opened.
- [x] Skip podczas otwierania, pamięć per projekt/intro-v2 i Replay w preview.
- [x] Testy Chromium oraz macierz WebKit 390/1440 dla trzech palet.
- [x] Regresja oprawy: 74 grupy PASS, HMR/StrictMode, długie imię bez wieku i przegląd artefaktów.
- [x] Nowe nagranie, licencje i końcowy STATUS.

## Dodatkowa korekta oprawy — 2026-11-02

- [x] Cała treść poniżej koperty ukryta do Open/Skip.
- [x] Oddzielne loadery obu szablonów i oczekiwanie na rzeczywiste assety.
- [x] Kolorowa fotografia, spokojne bliki i brokat przy przewijaniu.
- [x] Podstawowe kontrole zgodnie z preferencją użytkownika: verify, PHP i krótki przegląd Chromium; bez ponownej pełnej regresji.

## Wstęp i personalizacja Birthday Celebration — 2026-11-02

- [x] Gotowe, edytowalne teksty wstępu, sekcji, przycisków i koperty; zgodność ze starszymi zapisami.
- [x] Tło ambientowe i nowa oprawa koperty na podstawie inspiracji internetowych.
- [x] Stały układ sceny podczas przejścia koperta → hero oraz rezerwacja miejsca na scrollbar.
- [x] Kontrole kodu i produkcyjny build; bez sprawdzania widoków zgodnie z prośbą użytkownika.

## Galeria i kreator — 0.7.0

- [x] Inwentaryzacja katalogu, edytorów, szkiców, gotowości, publikacji i działającego RSVP.
- [x] Metadane prezentacyjne w Catalog, palety i dziewięć miniatur z rzeczywistych rendererów.
- [x] Lekkie karty oraz prywatne demo bez tworzenia projektów, publikacji i odpowiedzi.
- [x] Potwierdzenie nazwy, wybrany szablon i paleta w POST, blokada podwójnego kliknięcia i nieznanego wyniku.
- [x] Wspólny stan edytora, istniejące sekcje pól, pięć stabilnych kroków w definicji typu.
- [x] Save draft / Save & continue, Back, dirty guard, focus, URL/fallback i pamięć ostatniego kroku bez treści formularza.
- [x] Podsumowanie i linki braków z istniejącej backendowej walidacji read-only; dotychczasowy PublicationPanel i QR.
- [x] Basic-page bez kroków wydarzenia; RSVP tylko według rzeczywistej funkcji katalogu.
- [x] Krytyczne E2E na buildzie produkcyjnym i dotychczasowej bazie testowej; screenshoty desktop/mobile.
- [x] Dokumentacja metadanych, miniatur, kroków, zapisu, demo i ograniczeń.

## Jeden rzeczywisty podgląd

- [x] Usunięcie tekstowej makiety i powielonego podglądu Style.
- [x] Wspólny publiczny rejestr rendererów dla live/saved/demo, bez kopiowania szablonów.
- [x] Izolowany iframe, handshake, ścisłe origin/source/struktura, brak konfiguracji w URL i nonce w komunikacji.
- [x] Aktualne niezapisane dane, odporne daty/placeholdery, RSVP bez mutacji.
- [x] Mobile/Desktop, Edit/Preview z zachowaniem formularza, zatrzymanie ukrytych efektów.
- [x] Otwarte live, jawne Replay opening i czytelny Preview saved draft.
- [x] Produkcja, krótki HMR, aktualizacja dokumentacji i STATUS; zakończono dalsze testy na prośbę użytkownika.

## Dalsze etapy

- [ ] PHPCS i CI, prywatny podgląd basic-page.
- [ ] Płatności, media/uploady i jawna integracja sprawdzonych assetów jako oddzielne moduły.

## Wedding W1 — fundament danych i rejestry

- [x] Inwentaryzacja wspólnego Site, kontraktów, snapshotów, edytorów, rendererów, RSVP i brakującego modułu mediów.
- [x] Kontrakt wedding, 14 rodzajów sekcji, defaults, rejestry wariantów/stylów/presety i generowane TS.
- [x] Wspólny zapis/odczyt/PATCH, reguły układu, referencji, limitów oraz dat przez EventDate.
- [x] Stan development: ukrycie katalogu, tworzenie administracyjne i serwerowy zakaz publikacji.
- [x] Wyłącznie kontrole schematu, składni i typów; runtime niezweryfikowany.
- [x] docs/WEDDING.md: stan, decyzje, ogólny plan W2–W6 i następny krok.
- [x] W2: bezpieczne media i modularny edytor sekcji — implementacja i kontrole statyczne poniżej; runtime niezweryfikowany.


## Wedding W2 — edytor i wspólne media

- [x] Administracyjne tworzenie szkicu przez wspólne API, bez ujawnienia wedding w katalogu.
- [x] Rejestracja WeddingFields i integracja ze wspólnym zapisem, dirty state, błędami i sesją.
- [x] Wspólne dane/miejsca, potwierdzane czyszczenie referencji, 14 formularzy sekcji i stabilne listy.
- [x] Włączanie i Move up/down bez usuwania danych, zablokowane hero/footer, wygląd tylko do odczytu.
- [x] Wspólna usługa mediów i customowy selektor: upload, biblioteka z paginacją, wybór, alt i usuwanie referencji.
- [x] Kontrola właściciela/markera/capabilities/nonce, walidacja przypisania, formatu, wymiarów i limitu biblioteki.
- [x] Blokada zapisu przy uploadzie, osobne operacje upload/PATCH, informacja o publicznych URL uploads.
- [x] Komunikat braku wizualnego podglądu, bez renderera, animacji, ślubnego RSVP i publikacji.
- [x] Wyłącznie php -l, TypeScript i kontrola kontraktów; brak runtime/wizualnych/integracyjnych testów.
- [x] Aktualizacja WEDDING, MEDIA i STATUS z ograniczeniami oraz następnym krokiem.
- [x] W3: Modern Editorial i prywatny podgląd zapisanego szkicu — implementacja poniżej, runtime niezweryfikowany.


## Wedding W3 — Modern Editorial

- [x] Specyfikacja implementacji stylu: tokeny, skale, układy, niepełne dane i responsywność.
- [x] Renderer 14 sekcji z jawnym rejestrem i trzema kompozycjami hero bez utraty content.
- [x] Trzy palety i trzy pary fontów pod dotychczasowymi identyfikatorami; lokalne WOFF2/OFL/provenance.
- [x] Kontrolowane linki/anchory, semantyka, zdjęcia z srcset/sizes, fallbacki, natywne FAQ i osobny countdown.
- [x] Zbiorcze autoryzowane media oraz administracyjny podgląd zapisanego szkicu przez istniejącą powłokę.
- [x] Rozdzielenie rendererImplemented i dostępności publicznej; brak publikacji, live sync, demo, wejść i aktywnego RSVP.
- [x] Wyłącznie php -l, TypeScript i kontrola aktualności kontraktów; schematy bez zmian.
- [x] Aktualizacja dokumentacji i STATUS bez deklarowania wizualnej/runtime weryfikacji.
- [ ] W4 na osobne zlecenie: wejścia, pełna integracja podglądu, osobne demo i presety.
