# Modern Editorial — specyfikacja implementacji W3

Data: 2026-11-03. To specyfikacja kodu, nie raport oględzin lub potwierdzenie wyglądu, responsywności czy runtime. Renderer `modern-editorial@1` obsługuje wyłącznie typ wedding. Publiczna dostępność nadal ma stan development; rendererImplemented=true nie daje prawa publikacji.

## Kierunek i granice

Ciepła strona redakcyjna: duże szeryfowe imiona, użytkowy sans, zdjęcia o czytelnej hierarchii, linie i krótkie podpisy. Brak kart SaaS, glassmorphism, gradientów dekoracyjnych, emoji, ozdobnego frameworka, slidera/lightboxa i animacji wejścia. Sekcje tekstowe nie mają stałych wysokości. Hero fotograficzne ma jedynie minimalną wysokość kompozycji; treść może je powiększyć.

Kod: app/src/renderers/wedding-modern-editorial. ModernEditorial składa sekcje, sections/registry.tsx jawnie wybiera komponenty, Hero zawiera trzy kompozycje, pozostałe moduły dzielą sekcje tematycznie. Elements to semantyczna powłoka/tekst/czas/strzałka; Photo obsługuje pojedynczy autoryzowany DTO. format.ts formatuje wyłącznie kanoniczny UTC w podanej strefie IANA i waliduje linki. Żaden moduł sekcji nie pobiera sesji, biblioteki zdjęć ani API i nie importuje routera/formularzy panelu.

## Tokeny

Tokeny CSS są ograniczone do .modern-editorial, warianty wybierają istniejące data-palette/data-font-pair. Nie zmieniamy globalnej typografii innych szablonów.

| Token | Ivory & Ink / ivory-ink | Sage & Linen / sage-linen | Rose & Cocoa / rose-stone |
| --- | --- | --- | --- |
| background | #F7F3EC | #F2F3EC | #FBF2EF |
| surface | #EEE7DC | #E3E7DC | #F0E0D8 |
| text | #242421 | #29392F | #44312E |
| muted | #5E574D | #4D5D4E | #6B4F49 |
| accent | #78644C | #64785F | #966858 |
| border | #C9BCA9 | #B4BEAE | #D2B4A9 |
| button | #242421 | #29392F | #44312E |
| button-text | #F7F3EC | #F2F3EC | #FBF2EF |

Akcent stosujemy do linii i dużego znaku &, nie automatycznie do drobnego tekstu. Przyciski i linki mają ciemny tekst/tło odpowiedni do palety. Photo-full używa białego tekstu na jednolitej czarnej warstwie 65%; przycisk ma białe tło i tekst #242421. Nie wykonano audytu kontrastu ani pomiarów w przeglądarce.

Szerokość strony 78rem, gutter clamp(1.25rem, 5vw, 5rem), odstęp sekcji clamp(3.25rem, 8vw, 8rem). Tekst ma szerokość do 64ch (zaproszenie do 48ch). Odstępy i linie należą do każdej sekcji, nie do konkretnego zestawu jej sąsiadów. Powierzchnie alternatywne występują przy countdown/gifts/rsvp; pozostałe układy różnią się kompozycją zamiast powielania kart.

## Typografia i pliki

Mapowanie zachowuje identyfikatory W1:

| fontPair | Szeryf | Sans | Lokalne nazwy po subsettingu |
| --- | --- | --- | --- |
| editorial-serif | Cormorant Garamond 400 | Manrope 400–600 | Microsite ME Serif One / Sans One |
| modern-romantic | Libre Baskerville 400 | Source Sans 3 400–600 | Microsite ME Serif Two / Sans Two |
| timeless-classic | Playfair Display 400 | Inter 400–600 | Microsite ME Serif Three / Sans Three |

Sześć lokalnych WOFF2, bez pobierania Google Fonts w runtime. Serif ma tylko używaną wagę 400, sans zakres variable 400–600; osie pozostałe zamrożono na domyślnych wartościach upstream. Brak italików i kompletów nieużywanych wag. Subset obejmuje Latin/Latin Extended, w tym polskie litery, interpunkcję U+2000–206F i wybrane symbole. Fonty spoza tego zakresu korzystają z systemowych fallbacków.

font-display: swap. CSS deklaruje rodziny, ale style używają wyłącznie wybranej pary; nie ma JS ładującego wszystkie fonty ani preload sześciu rodzin. Pliki wszystkich rodzin są assetami stylu, co nie oznacza żądania ich wszystkich przez przeglądarkę. Tego zachowania sieciowego nie mierzono w W3.

Skale: imiona clamp(2.75rem, 8vw, 8rem), w desktopowym split clamp(2.75rem, 5.25vw, 6rem), h2 clamp(2.25rem, 5.5vw, 5rem), h3 clamp(1.6rem, 3vw, 2.5rem), body clamp(1rem, 0.95rem + 0.25vw, 1.1875rem). Długie imiona mają własne wiersze, balance i overflow-wrap:anywhere; nie używamy nowrap ani ucinania tekstu. Fallbacki: Georgia/Times/Palatino dla serif oraz Arial/Segoe UI/system-ui dla sans.

Oficjalne źródła, wersje, SHA, licencje OFL i przekształcenia: fonts/provenance.json oraz fonts/*-OFL.txt i README.md. Główne nazwy zmodyfikowanych fontów zmieniono na Microsite ME, zachowując copyright/licencje; oryginalne rodziny podajemy jako źródła. Specyfikacja nie jest deklaracją przetestowania renderowania glifów na urządzeniu.

## Hero

Wszystkie kompozycje korzystają z content.couple i content.event, opcjonalnego subtitle/photo/CTA w sekcji. Zmiana wariantu w formularzu zmienia tylko variant i nie usuwa treści. Nazwy wariantów wybierają jawne komponenty, nie pliki lub klasy klienta.

- photo-full: zdjęcie obejmuje powierzchnię hero, z jednolitą warstwą czytelności; tekst zachowuje normalny przepływ, zdjęcie ma object-fit:cover.
- split: fotografia 4:5 i typografia obok siebie od 56rem; na mniejszych ekranach tekst i obraz układają się pionowo, bez wymuszonej wysokości tekstu.
- typography: imiona, ampersand, data, cienka linia i opcjonalny podtytuł/CTA; bez rezerwowania pustego pola na fotografię.

Brak dostępnego zdjęcia albo błąd jego załadowania w photo-full/split przełącza kompozycję na typography. Nie ma zdjęć stockowych obcej pary, fikcyjnej daty lub wieku. Przy pustych imionach prywatny szkic pokazuje ogólny tytuł „Our wedding”. Nie jest on zapisywany do projektu.

CTA wskazuje wyłącznie istniejącą, włączoną i renderowalną sekcję docelową rsvp/venues/schedule. Gdy celu nie ma lub jest pusty, CTA jest pomijane. Anchor ma prefiks wedding-section- i bezpieczne id instancji z kontraktu. Nawigacja jest natywna; bez automatycznego scrollowania, scroll-jackingu lub narzucania smooth scroll.

## Sekcje i niepełne szkice

Renderujemy enabled=true w zapisanej kolejności. Nie dodajemy ponownie wyłączonych sekcji i nie kasujemy ich danych. Wspólna walidacja W1 nadal wymaga hero na początku i footer na końcu.

| Sekcja | Implementacja |
| --- | --- |
| invitation | Wyśrodkowana typografia i zwykły tekst z zachowaniem akapitów. |
| countdown | Tylko wspólny startsAt UTC; jeden timer w osobnym komponencie, cleanup przy odmontowaniu, pauza poza aktywnym podglądem. Wartości minimum zero; po terminie spokojny komunikat. Bez daty sekcja jest pomijana. |
| venues | Tylko wskazane wspólne miejsca, nazwa/adres/czas; link Google Maps z encodeURIComponent(adres), bez iframe. |
| schedule | Lista w kolejności konfiguracji; pełny termin w strefie pozycji, opis, opcjonalna nazwa wspólnego miejsca. Bez parsowania opisowych godzin. |
| story | Tekst i opcjonalne zdjęcie; siatka pojawia się wyłącznie ze zdjęciem. |
| gallery | Siatka 1/2/3 kolumn, proporcje 4:5, stabilne id, alt z użycia; bez slidera/lightboxa. |
| guest-info | Redakcyjne bloki, różne długości, bez równych wysokości kart. |
| travel | Opis oraz oddzielone liniami opcje noclegu/transportu, opcjonalne bezpieczne linki. |
| gifts | Tekst i lista linków, bez zbierania płatności i formularzy bankowych. |
| faq | Natywne details/summary, klawiatura, marker CSS; odpowiedź bez pytania jest zwykłym tekstem. |
| rsvp | Heading/text oraz informacja o W5 w podglądzie, brak aktywnego formularza. |
| contact | Tylko niepuste nazwy/poprawne kanały; bezpieczne mailto i tel, bez pustych odnośników. |
| footer | Krótki tekst i wspólne imiona, cienka linia, bez wysokiego pustego bloku. |

Puste opcjonalne sekcje/listy/pola są pomijane; sama pusta galeria czy harmonogram nie tworzą wielkiego kontenera. Hero i footer pozostają ramą strony. Fallback nagłówka dostępności pochodzi z nazwy sekcji, jest ukryty wizualnie przy pustym nagłówku klienta. Teksty są zwykłym JSX i white-space:pre-wrap, nigdy HTML. Format daty korzysta z języka dokumentu, ale zawsze z zapisanej strefy, bez wyliczania UTC przez domyślną strefę przeglądarki.

## Media i prywatny podgląd

GET sites/{id}/preview pozostaje wspólną operacją; dla wedding wymaga także administratora i zwraca previewMedia tylko dla zdjęć wskazanych przez włączone sekcje (maks. 42 unikalne referencje). Backend sprawdza autora, marker, MIME/status i istnienie pliku przez wspólny MediaService. Brakujące/niedozwolone zdjęcie jest pomijane w DTO, bez ujawnienia URL; szkic nie jest zmieniany. Próba zapisania niedozwolonej referencji nadal jest błędem.

Powłoka przekazuje gotowe DTO przez istniejący RendererFrame do TemplatePreview. Renderer nie wysyła requestów dla zdjęć i nie otrzymuje biblioteki użytkownika. Kontrola wiadomości zachowuje origin/source i ograniczenia struktury, dodając arrays/oneOf i ograniczone DTO mediów; wedding jest przyjmowane wyłącznie w trybie saved. Brak nonce/sesji w wiadomości, URL lub kodzie renderera. Iframe nadal ma restrykcyjne CSP i sandbox, w tym blokadę zewnętrznej nawigacji w prywatnym podglądzie. Linki są widoczne, ale powłoka podglądu blokuje ich otwieranie poza anchorami.

Photo wybiera large/medium zamiast bezwarunkowego oryginału, przekazuje srcset/sizes oraz wymiary; hero eager/high, zdjęcia poniżej lazy. CSS określa proporcje. Nieautoryzowany plik nie ma DTO; błąd ładowania usuwa img lub przełącza hero na typografię. Standardowe lokalne uploads są wspierane; nie wprowadzono obsługi prywatnego storage lub zewnętrznego CDN. Pliki uploads mogą być publiczne przez URL mimo prywatnego szkicu.

## Responsywność i dostępność

Mobile-first, progi 36rem i 56rem. Kontenery/grids mają minmax(0, ...) i min-width:0; obrazy max-width:100%, teksty overflow-wrap:anywhere. Nie używamy ukrywania poziomego overflow do maskowania uciętej treści. Przyciski mają min-height:3.25rem, odnośniki i summary co najmniej 2.75rem. Focus jest widoczny; nagłówki h1/h2/h3 i natywne listy/FAQ zachowują semantykę. Countdown nie ogłasza sekund przez aria-live. Nie dodano ruchu wymagającego reduced motion ani GSAP.

Nie oceniano zachowania powiększenia, maksymalnych treści, fizycznych urządzeń ani faktycznego overflow. Wymagają osobnego zlecenia. Live preview niezapisanych zmian, wejścia, demo i presety pozostają W4; aktywne RSVP i publikacja W5; dokładna weryfikacja W6.
