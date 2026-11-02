# Jeden podgląd wizualny w panelu

Kreator używa rzeczywistego renderera z `renderers/registry.ts`, takiego samego jak strona publiczna. Usunięto BirthdayInvitationSummary, BasicPagePreview jako powłokę osadzonego podglądu, dodatkową miniaturę kroku Style oraz style makiety birthday-summary. BasicPage pozostaje właściwym rendererem strony, nie zastępczą wizualizacją.

## Źródła danych

- Live preview pokazuje aktualny stan formularza, także niezapisany. Aktualizacja nie wykonuje PATCH, publikacji ani odczytu publicznej strony.
- Preview saved draft odczytuje ostatni zapis przez istniejący chroniony endpoint podglądu. Przy niezapisanych zmianach można świadomie zapisać i otworzyć podgląd albo otworzyć zapisaną wersję w nowej karcie, zachowując formularz w obecnej.
- Demo galerii używa tej samej infrastruktury iframe i fikcyjnych danych katalogu. Nie powstają projekty ani odpowiedzi.

## Izolacja i komunikacja

`/app/preview-frame/` jest pustym dokumentem renderera wymagającym sesji i istniejącego uprawnienia edit_ms_sites. Nie pobiera projektu, nie generuje bootstrapu kont, nonce ani tokenu CSRF. Właściwy projekt nadal pobiera rodzic przez dotychczasowe API z kontrolą właściciela. URL iframe nie zawiera konfiguracji.

Rodzic wysyła konfigurację dopiero po handshake ready. Obie strony weryfikują dokładny origin i source okna. Protokół sprawdza zewnętrzne klucze, kontekst oraz strukturę szkicu według istniejących kontraktów. Rejestr struktur jest wyprowadzany z plików kontraktów v1; we wspólnej powłoce nie ma kroków ani warunków typu birthday-invitation. Wiadomość zawiera wyłącznie typ/szablon/wersję, szkic i kontekst prezentacji. Brak nonce, sekretów, ID konta lub publicznych linków zarządzania.

Iframe ma sandbox bez formularzy, popupów i nawigacji nadrzędnej. Przechwytuje zewnętrzne odsyłacze i wysłanie formularza. Nagłówki ograniczają osadzanie do tego samego originu, wyłączają cache oraz blokują połączenia API w dokumencie produkcyjnym. W development dozwolone są połączenia istniejącego Vite/HMR. CSP i sandbox uzupełniają ochronę, nie zastępują autoryzacji backendu.

## Viewport i layout

Live preview ma rzeczywisty viewport Mobile 390×844 albo Desktop 1440×900. Szerokość iframe uruchamia właściwe media queries i jednostki viewportu. Skala dopasowuje gotowy viewport do miejsca w panelu, bez renderowania desktopu w wąskiej kolumnie. Dokument ma własny scroll i nie importuje CSS panelu.

Na szerokim ekranie podgląd może pozostać sticky z ograniczoną wysokością i własnym przewijaniem. Przy szerokości panelu do 950 px przyciski Edit / Preview przełączają widoczność kolumn. Formularz pozostaje zamontowany; dane nie giną. Pełnoekranowy podgląd zapisu i demo mają viewport dopasowany do szerokości okna.

## Renderery i animacje

`preview/TemplatePreview.tsx` wybiera wyłącznie istniejący komponent renderera. Metadane supportsOpening i supportsRsvp należą do rejestru szablonów. Nie są kopiowane JSX ani style zaproszeń. Kolejny typ wymaga własnego renderera, kontraktu i wpisu w istniejącym rejestrze.

Osadzony tryb live zaczyna od otwartej treści. Replay opening inicjuje prawdziwe otwarcie przez osobny licznik, niezależny od tekstu, palety i kroku. Klucz komponentu zależy tylko od szablonu/wersji, nie od całego szkicu. Ponowne Replay kasuje poprzednią choreografię i emisję. Ukrycie iframe lub karty zatrzymuje GSAP, animacje CSS i ciągłe efekty; powrót nie rozpoczyna intro od nowa. Reduced motion i dotychczasowe przyciski pauzy pozostają obsługiwane.

## Niekompletne dane i RSVP

Prezentacja daty korzysta z aktualnego localDateTime w trybie preview. Nie udaje zapisanego UTC i nie zmienia reguł normalizacji DST backendu. Niepoprawna data/strefa daje neutralny placeholder zamiast wyjątku. Publiczna strona nadal formatuje zapisany startsAt. Placeholdery i bezpieczne opcjonalne wartości istnieją wyłącznie w renderowaniu; nie trafiają do szkicu.

PreviewRsvp współdzieli GuestFields i CSS publicznego formularza. Zachowuje jego wygląd i lokalną interakcję pól, ale nie importuje klienta wysyłającego odpowiedzi, nie tworzy sekretów i ma wyłączony przycisk wysłania. Włączenie/wyłączenie RSVP w formularzu od razu zmienia podgląd. Podsumowanie danych przed publikacją i komunikaty walidacji pozostają normalną częścią edytora.

## Build i weryfikacja

Czwarty entry Vite to src/preview-frame.tsx. App wybiera assety tego dokumentu z manifestu produkcyjnego albo istniejącego lokalnego Vite. Nie trzeba uruchamiać drugiej instancji. Kod HTML dokumentu jest niezależny od motywu.

Wykonano npm run verify, składnię PHP, cztery grupy TEST_SCOPE=preview na dotychczasowej odseparowanej bazie oraz pięć grup regresji galerii. Porównano wygląd/metryki nagłówków trzech istniejących rendererów z publicznymi wersjami przy tej samej szerokości i konfiguracji. Krótki scripts/review-preview-dev.mjs potwierdził entry, handshake, aktualizację danych i CSS HMR bez przeładowania; używa wyłącznie fikcyjnych danych w tymczasowym lokalnym harnessie i przywraca pliki po zakończeniu.

Artefakty w app/test-results/live-preview: embedded-*.png, public-*.png, panel-desktop.png, panel-mobile-edit.png, panel-mobile-preview.png i development-hmr.png. Obejrzano desktop 1440×900 oraz telefon 390×844 i reprezentatywne pary podgląd/publiczna strona. Nie wykonywano pełnej historycznej regresji ani macierzy Safari/WebKit. Kolejne poprawki mają ograniczać się domyślnie do podstawowej kontroli, zgodnie z preferencją użytkownika.
