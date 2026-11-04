# Stan faktyczny — 2026-11-02


## Aktualna poprawka: wspólny rzeczywisty podgląd

Usunięto BirthdayInvitationSummary, osadzoną powłokę BasicPagePreview, miniaturę Style i style tekstowej makiety. Jeden RendererFrame obsługuje live, zapisany szkic i demo, a TemplatePreview wybiera rzeczywiste komponenty z publicznego rejestru rendererów. Brak kopiowania układu lub dekoracji szablonów. Normalne podsumowanie Review pozostało.

- Bieżące, niezapisane dane przekazywane w pamięci po gotowości iframe; zero zapisu/publikacji podczas edycji.
- Kontrolowane viewporty Mobile 390×844 i Desktop 1440×900, izolacja CSS, Edit / Preview bez odmontowania formularza.
- Domyślnie otwarta treść, jawne Replay opening, bez restartu przy zmianie tekstu/palety/kroku; pauza po ukryciu.
- Preview saved draft jednoznacznie pokazuje ostatni zapis; dostępna nowa karta bez utraty bieżącego formularza.
- Rzeczywiste pola/styl RSVP bez API odpowiedzi i aktywnych linków zarządzania.
- Bezpieczna prezentacja aktualnej lokalnej daty oraz neutralne placeholdery; kontrakty i normalizacja backendu bez zmian.
- Pusty chroniony dokument /app/preview-frame/ nie zawiera nonce lub szkicu. Ścisłe origin/source/kształt wiadomości; sandbox, CSP i blokada nawigacji zewnętrznej. Development i produkcja korzystają z tego samego entry.

Wykonane: verify (kontrakty, ESLint, TypeScript, build) PASS; PHP App/preview-frame PASS; cztery grupy TEST_SCOPE=preview PASS i pięć grup TEST_SCOPE=gallery PASS na tej samej microsite_test_430601248a09bf6c; test lokalnego iframe/CSS HMR PASS. Porównanie metryk/style/fontów wszystkich trzech szablonów z publicznym rendererem PASS. Zrzuty 1440×900 i 390×844 obejrzane; artefakty w app/test-results/live-preview/. Lokalna baza strony i ustawienie rejestracji bez zmian, istniejący Vite pozostawiony.

Ograniczenia: nie powtarzano pełnej regresji i Safari/WebKit. Development/HMR sprawdzono na tymczasowym lokalnym harnessie z fikcyjnymi danymi, a pełny przepływ z rzeczywistą sesją na produkcyjnym buildzie izolowanego WordPressa. Użytkownik ponownie ograniczył testy do podstawowych; dalsze sprawdzanie zakończono. Dokumentacja: [PREVIEW.md](PREVIEW.md).

Przykładowy kreator: http://celebrations.local/app/sites/10?step=about


## Poprzedni etap: galeria i kreator — 0.7.0

Działa galeria z katalogu, dziewięć rzeczywistych miniatur dla wszystkich palet, prywatne demo bez projektu/odpowiedzi oraz potwierdzenie nazwy przed utworzeniem. Zaproszenia mają pięć kroków z jednym stanem i dotychczasowym PATCH. Basic-page zachowuje prosty edytor. Podsumowanie korzysta z istniejącego read-only GET projektu, Publication::describe i walidatora backendu, a publikacja/link/QR z dotychczasowego PublicationPanel. Szablonu istniejącego projektu nie można zmienić.

Adresy LocalWP (wymagana sesja):

- Galeria: http://celebrations.local/app/sites/new
- Przykładowy kreator istniejącego projektu: http://celebrations.local/app/sites/10?step=about
- Demo bez tworzenia: http://celebrations.local/app/sites/new?type=birthday-invitation&demo=birthday-celebration&palette=midnight-gold

**Weryfikacja aktualnego etapu:**

- npm run verify — PASS: kontrakty, ESLint, TypeScript i produkcyjny build.
- php -l includes/class-catalog.php i microsite-core.php — PASS; git diff --check — PASS.
- TEST_SCOPE=gallery npm run test:integration — pięć grup PASS na prawdziwym WordPressie i tej samej stałej bazie microsite_test_430601248a09bf6c. Końcowy przebieg z UPDATE_TEMPLATE_THUMBNAILS=1 wygenerował dziewięć PNG z rzeczywistych rendererów. Początkowe klatki loadera wykryto podczas oględzin i zastąpiono po poprawieniu oczekiwania na renderer; nie są końcowymi assetami.
- Nowe konto → galeria → demo bez POST/RSVP → wybór i zachowanie palety → pojedyncze utworzenie mimo double-click → pięć kroków → częściowy zapis i reload → preview → administracyjne prawo tylko w teście → publikacja → anonimowy odczyt → odpowiedź gościa → panel odpowiedzi — PASS.
- Opóźniony i nieudany zapis, zachowanie danych/kroku, Back, dirty leave, nieznany krok, wyłączenie RSVP i brak funkcji RSVP w katalogu/fallback, brak prawa publikacji, read-only gotowość, focus braków, niezależny szkic/live, basic-page oraz utracona odpowiedź POST (projekt rzeczywiście istnieje, bez ponowienia) — PASS.
- Krytyczny przebieg używał produkcyjnego manifestu i nie pobierał Vite. Dotychczasowego Vite strony LocalWP nie zatrzymywano ani nie uruchamiano ponownie. users_can_register strony LocalWP nadal 0; żadnych testowych projektów lub odpowiedzi nie tworzono na jej bazie.
- Galeria, formularz, review i błąd zapisane w 390×844 i 1440×900. Brak poziomego overflow w sprawdzanych widokach. Obejrzano końcowe zrzuty galerii desktop/mobile, formularza mobile, review desktop/mobile, błędu mobile i miniatury prawdziwych zaproszeń.

Artefakty: wp-content/plugins/microsite-core/app/test-results/gallery/{gallery,form,review,error}-{desktop,mobile}.png. Są ignorowane przez Git. Źródłowe miniatury w assets/template-previews są wersjonowanymi assetami wtyczki.

**Ograniczenia zakresu:** wykonano skoncentrowany test krytycznego przepływu, nie ponawiano całej historycznej regresji 74 grup ani macierzy Safari/WebKit. Wcześniejsze scenariusze dostały wspólną nawigację galerii/kroków; nie są raportowane jako ponownie uruchomione. PHPCS/CI, fizyczne urządzenia i pełny audyt dostępności nie były wykonywane. Demo pozostaje prywatnym widokiem panelu. Bez nowych efektów, szablonów, płatności, hostingu lub resetu LocalWP. Szczegóły implementacji i regeneracji miniatur: [GALLERY-WIZARD.md](GALLERY-WIZARD.md).

## Historia poprzednich etapów

Birthday Celebration: dopracowanie koperty, konfetti i fotografii kuli, wtyczka 0.6.2. templateId birthday-celebration/templateVersion "1", schemaVersion 1 bez zmiany kontraktów danych. Zachowano układ po otwarciu, trzy palety, edytowalne treści, konta, publikację/snapshoty, RSVP i wcześniejsze szablony. Płatności nie są wdrażane. Istniejący Vite pozostaje uruchomiony, baza LocalWP nie była resetowana, ustawień rejestracji nie zmieniano.

## Zmiany

**Koperta:** osobny Envelope.tsx i envelope.css z warstwami shadow/back/card/front pocket/flap/seal, fakturą papieru, tłoczeniem, metalicznymi krawędziami, światłem i grubością. Grafit/ivory, śliwka/blush i granat/ice według palety. Karta początkowo niewidoczna, z danymi projektu (YOU’RE INVITED, imię, opcjonalny wiek), zasłaniana przez kieszeń. Klapka ma obie strony/backface visibility, zawias i perspective; po przekroczeniu płaszczyzny przechodzi za kartę. Żaden globalny overflow nie ucina wysuniętej karty.

useInvitationIntro.ts obsługuje jawne closed/opening/opened i jeden timeline: pieczęć 0–0.24s, klapka 0.18–0.85s, karta 0.7–1.44s, przejście do prawdziwego hero 1.48–2.48s. Synchronous ref blokuje wielokrotne rozpoczęcie. Skip działa przed i w trakcie, resetuje konfetti, sprząta timeline i odsłania pełną treść. Hero jest inert/aria-hidden pod inline intro, bez modalnej pułapki focusu lub blokady scrolla. Po otwarciu focus trafia na imię bez przewijania; Skip kieruje do szczegółów. sessionStorage przechowuje tylko "skipped", osobno według projektu i envelope-v2. Preview ignoruje tę pamięć i ma Replay intro. Błąd GSAP lub HMR w trakcie otwierania odsłania treść zamiast pozostawiać stan blokujący.

**Konfetti:** canvas-confetti 1.9.4, ISC, jedyny silnik burstów. Oficjalny Realistic Look przeczytano wraz z parametrami i kodem pięciu profili. Zaadaptowano proporcje .25/.20/.35/.10/.10, różne spread/startVelocity/decay/scalar, flat:false, wyłącznie square. Dwa dolne boczne początki, kierunek do środka/w górę, odstęp 110ms, 80 cząstek na telefonie i 168 na desktopie. Emisja przy odsłonięciu hero (1.85s), skończony efekt bez deszczu w pętli. Palety gold/champagne/ivory, rose/rose-gold/blush i silver/blue/white; nie deklarujemy metalicznego renderowania. Pause blokuje nowe emisje, usuwa timeouty i resetuje aktualny burst, nie obiecuje wznowienia tych samych cząstek. Hidden/unmount/reduced motion również resetują. Własny Canvas rysuje teraz wyłącznie rzadkie spokojne tło, bez drugiego konfetti. Canvas i dekoracje mają pointer-events:none.

**Kula:** prawdziwa fotografia Reginy Valetovej z podanej strony Unsplash. Obejrzano źródłowy plik 1600px i wynikowy lokalny WebP. Zapisano centralny crop kuli z oryginalnymi kolorowymi refleksami, 640×640, 148,840 bajtów (aktualizacja 2026-11-02). Plik jest nieprzezroczysty: miękka maska CSS i blend usuwają prostokątną granicę, bez fałszywej szachownicy/claimu alpha. Lustra zachowują fotograficzne błękitne/złote odbicia; otoczenie i bliki dopasowano do palety. Kula jest wyłącznie dekoracją hero, ma małe wahnięcie ±1.4°, ruch 1–2px i spokojne refleksy; nie obraca się o 360° ani rotateY. Usunięto poprzedni sztuczny wzór SVG.

Asset ładuje się lokalnie tylko w tym szablonie. Koperta pozostaje kodem React/CSS, bez frameworka UI, obrazka całej koperty lub pustych assetów. Źródła/licencje/autor/data/hash w THIRD-PARTY-ASSETS.md i app/src/assets/birthday-celebration/README.md; ISC notice zachowano w podkatalogu licenses. Sprawdzono też metadane alternatywy Rawpixel/Openclipart, ale jej nie integrowano i nie obchodzono logowania.

## Linki

- Lokalna publikacja: http://celebrations.local/s/98ddf7ec4fd399c19e934891195f0617/
- Prywatny podgląd z Replay intro: http://celebrations.local/app/sites/10/preview

Zmiany renderera zastosowano bez modyfikowania treści projektów lub publikowania poza LocalWP. Odpowiedzi testowe wysyłano tylko na stałej bazie microsite_test_430601248a09bf6c. Istniejących odpowiedzi użytkownika na LocalWP nie usuwano.

## Weryfikacja

- npm run verify: kontrakty, ESLint, TypeScript i produkcyjny build — PASS. Nowy chunk około 31.8 kB raw / 10.5 kB gzip obejmuje kod szablonu i bibliotekę; CSS około 22.0 kB / 5.4 kB gzip. Fonty nadal lokalne, 182,620 bajtów razem. Brak aktualizacji istniejących wersji zależności; dodano przypięte canvas-confetti i typy 1.9.0.
- TEST_SCOPE=celebration npm run test:integration: 6 grup PASS na rzeczywistym WordPressie i stałej osobnej bazie. Zawiera bazowe testy nowego szablonu oraz rozszerzenie WebKit. Baza została zachowana.
- Pełna regresja wcześniejszej wersji oprawy: 74 grupy PASS na tej samej stałej bazie. Po ostatnich zmianach zgłoszonych przez użytkownika nie powtarzano pełnej regresji ani macierzy; zgodnie z jego prośbą wykonano podstawowe kontrole opisane niżej.
- LocalWP: 8 anonimowych smoke/HMR testów PASS. Rejestracja pozostała wyłączona, bez restartu Vite i wysyłania testowych RSVP na LocalWP.
- node app/scripts/review-celebration-dev.mjs — PASS: StrictMode, HMR po otwarciu i podczas opening, cleanup ScrollTrigger/RAF, kontrolowany visibilitychange, ponowny mount oraz wymuszone błędy GSAP/Canvas z czytelną treścią. Pliki tymczasowe i edycje źródła przywrócono w finally.
- Chromium: normalne otwarcie klawiaturą, focus, pojedynczy burst, pauza/wznowienie ciągłych dekoracji, Skip i odświeżenie, prawdziwy RSVP, zamknięty RSVP i izolacja snapshotu, wszystkie palety/reduced motion/rozmiary, brak błędów konsoli i overflow.
- WebKit 27.2: trzy palety × 390×844 i 1440×900; karta/klapka i z-index, wiele kliknięć Open, pełne otwarcie, focus, Skip w trakcie, brak warstwy intro po Skip, reset burstu, zapamiętane pominięcie per projekt, pauza kuli, prawidłowy lokalny obraz 640px, rzeczywisty przycisk RSVP oraz Replay w prywatnym preview. Długi wariant bez wieku również przeszedł pełny przebieg, z kontrolą granic tekstu na wysuniętej karcie.
- Natywny safaridriver został sprawdzony: odmówił utworzenia sesji, ponieważ Allow remote automation w ustawieniach Safari jest wyłączone. Nie zmieniano uprawnień systemu ani ustawień przeglądarki. PASS WebKit oznacza silnik Safari, nie natywną sesję Safari GUI.

## Przegląd wizualny i artefakty

Obejrzano wcześniejszy ekran w przeglądarce przed zmianą oraz po zmianie. Oględziny obejmują lokalny zamknięty/open-card/hero i reprezentatywne zrzuty wszystkich palet na telefonie i desktopie. Zdjęcie ma prawdziwe lustra/srebro i miękką granicę; karta pozostaje nad otwartą klapką, a dolna część jest prawidłowo zasłonięta przez kieszeń. Układ hero po otwarciu pozostaje dotychczasowy.

Artefakty: app/test-results/celebration-refinement/. before-cover.png / before-hero.png, after-*.png, webkit-{palette}-{width}-{closed,card,hero}.png oraz lokalne local-closed-envelope.png / local-open-envelope-card.png / local-hero-confetti.png / local-final-hero.png. Nagranie pełnego lokalnego otwarcia z konfetti: opening-envelope-confetti.webm. Zapisano również screenshoty poprzedniej macierzy w oddzielnym katalogu celebration, bez nadpisywania birthday/publication/rsvp/smoke. Artefakty i build nie są commitowane.

## Ograniczenia

Nie ma brakujących wymaganych assetów ani zależności. Natywny Safari GUI wymaga włączenia automatyzacji przez użytkownika; sprawdzono WebKit zamiast deklarować nieuruchomiony test Safari PASS. Nie wykonano pełnego audytu dostępności, testów na fizycznym iPhonie/telefonie ani benchmarku energii/FPS. Nie uruchomiono PHPCS/CI, które pozostają dotychczasowym długiem zgodnie z AGENTS. Znane npm audit: 10 moderate w narzędziach lintujących, bez audit fix --force.

LocalWP jest środowiskiem lokalnym. Zachowane są wcześniejsze ograniczenia publikacji/RSVP/kont opisane w dokumentacji. Nie rozbudowywano backendu ani płatności; istniejące kontrakty i dane pozostają zgodne. Nie integrowano własnych SVG użytkownika.

## Ostatnie poprawki i podstawowa kontrola — 2026-11-02

Zgodnie z nową prośbą przed otwarciem koperty ukryta jest cała treść poniżej hero: story, szczegóły, RSVP i zakończenie. Obszar ma hidden/inert/aria-hidden, pojawia się po otwarciu albo Skip. Nie wystaje już spod zamkniętej koperty. To świadoma zmiana względem wcześniejszego wymagania dostępu do RSVP bez otwierania intro.

Osobne loadery dla dwóch szablonów zaproszeń: Birthday Celebration (metaliczny monogram, obwódka i delikatny pasek) oraz Birthday Party (własny znak/paleta). Kolory odpowiadają wybranemu wariantowi. Pierwszy loader jest już w serwerowym HTML, więc nie czeka na uruchomienie React. Ten sam CSS współdzielą PHP i komponent. InvitationAssetGate czeka na rzeczywiste fonty/obrazy, bez minimalnej sztucznej zwłoki; ma maksymalny fallback 1.8s i cleanup. Loader nie jest długim timerem ani atrakcją blokującą wejście.

Kula korzysta ponownie z kolorowego pliku źródłowego, bez desaturacji. Dodano trzy powoli pulsujące bliki. Podczas przewijania pojawia się drobny brokat przy krawędziach, z krótkim życiem i małą liczbą elementów (maks. 24 telefon / 42 desktop), bez zasłaniania pól. Pauza, hidden i reduced motion wyłączają ruch/nowe efekty; scroll listener i RAF są sprzątane.

Na życzenie użytkownika ograniczono dalsze testy do podstawowych:

- npm run verify po tych zmianach: kontrakty, ESLint, TypeScript i produkcyjny build — PASS.
- php -l templates/public.php oraz git diff --check — PASS.
- Krótki przegląd Chromium na LocalWP: loader → zamknięta koperta bez treści poniżej → karta → hero → widoczne i aktywne RSVP, bez wysyłania odpowiedzi — PASS. Brak pageerror.
- Osobny loader Birthday Party na istniejącej lokalnej publikacji — widoczny i prawidłowo znika; HTTP 200.
- Obejrzano kolorowy hero, loader Celebration i widok RSVP podczas scrolla z brokatem. Nie powtarzano ostatniej pełnej regresji, rozbudowanych testów ani nowej macierzy urządzeń.

Aktualne artefakty w tym samym katalogu celebration-refinement: loader-celebration.png, loader-birthday-party.png, latest-closed.png, latest-card.png, latest-color-hero.png, scroll-rsvp.png, latest-opening-color-glitter.webm. Wcześniejsze nagranie opening-envelope-confetti.webm ma 6.6s; obejrzano klatki karty i hero z konfetti. Te pliki są lokalne i ignorowane przez Git. Nie ma brakujących wymaganych plików. Natywne Safari GUI pozostaje niezweryfikowane z powodu wyłączonej automatyzacji; wcześniejsze testy WebKit są odnotowane osobno, bez przypisywania ich ostatnim poprawkom.


### Korekta typografii i pierwszego widoku — 2026-11-02

- Birthday Celebration: większe opisy, etykiety i kontrolki formularza; responsywne proporcje imienia i wieku.
- Usunięto wymuszoną wysokość 730/780 px. Koperta i hero dopasowują kompozycję do wysokości viewportu; długie treści mogą powiększyć sekcję bez ucinania tekstu.
- Metaliczny przycisk z refleksami na hover/focus, okrągłą oprawą ikony oraz własnymi strzałkami SVG zamiast znaków tekstowych.
- Zgodnie z prośbą użytkownika pominięto przegląd widoków i testy przeglądarkowe; kontrola kontraktów, ESLint, TypeScript i build: PASS (build w środowisku LocalWP).


### Birthday Celebration: edytowalne teksty i płynne otwarcie — 2026-11-02

- Domyślny wstęp: „Something special / is coming…”. Sekcja Template wording zawiera 42 gotowe pola (nagłówki, podpisy, przyciski, monogram, adresat koperty). Obsługiwane znaczniki: {name}, {age}, {palette}.
- Opcjonalne content.celebrationCopy w kontrakcie v1; stare projekty korzystają z domyślnych tekstów bez modyfikacji zapisanych danych. Teksty pozostają plain text; limity egzekwuje istniejący walidator.
- Własne tło CSS: płynąca poświata, smugi światła i drobiny, dopasowane do palety. Inspiracje: Codrops Ambient Canvas Backgrounds oraz Greenvelope Animated Envelope Invitations; bez kopiowania zewnętrznego kodu i assetów.
- Koperta: tłoczone wykończenie, metaliczne brzegi, ozdobna podszewka, adresat i monogram.
- Usunięto przełączanie hero absolute → relative. Koperta pozostaje ukryta i inert w tej samej komórce grid, więc zakończenie animacji nie zmienia wymiarów sceny. Stałe miejsce na scrollbar ogranicza boczne przesunięcie po odsłonięciu treści.
- Weryfikacja: kontrakty, ESLint, TypeScript, build i git diff --check PASS. Na prośbę użytkownika bez przeglądu widoków i bez ponownej regresji integracyjnej; płynność do oceny wizualnej użytkownika.

## Wedding W1 — 2026-11-03

Zaimplementowano wyłącznie fundament typu wedding: contracts/wedding.v1.json, WeddingSections, WeddingConfig, wpisy Catalog wedding/modern-editorial, wspólny zapis szkicu i rozszerzenie generatora TS o arrays/oneOf. Istniejący Site, kontrolery CRUD, własność, capabilities, pełna semantyka PATCH oraz magazyn snapshotów pozostają wspólne. Nie dodano tabel, projektu na LocalWP, edytora, renderera, uploadów ani ślubnego RSVP. Nie zmieniono rejestracji i praw publikacji.

Model: osobne imiona pary, opcjonalny pusty nagłówek, wspólne wydarzenie UTC/IANA, lista miejsc, kontrolowany wygląd/wejście oraz uporządkowane sekcje ze stabilnymi id. Kontrakty: hero, invitation, countdown, venues, schedule, story, gallery, guest-info, travel, gifts, faq, rsvp, contact, footer. Backend zawiera walidację układu, unikalności, referencji, linków i normalizację dat przez dotychczasowy EventDate. Attachment ID jest wyłącznie inertną referencją, bez potwierdzenia praw do mediów; wymagany bezpieczny resolver w W2 przed użyciem.

Ochrona niegotowego typu w kodzie: availability=development, wykluczenie z publicznego katalogu, POST developerskiego szkicu tylko dla administratora z manage_options oprócz dotychczasowych zabezpieczeń; publishable blokuje publikację również administratorowi z nadanym prawem. Brak wpisu w rendererach i brak udawanego edytora. Nie deklarujemy runtime tych zabezpieczeń jako przetestowanego.

Wykonane wyłącznie kontrole uzgodnionego zakresu:

- JSON parsing + walidacja metaschematu Draft 4 wedding.v1.json — PASS (jsonschema 4.25.1 w usuniętym katalogu tymczasowym, bez nowej zależności projektu).
- npm run contracts:generate — PASS; WeddingDraft oraz DraftBySiteType.wedding wygenerowane ze schematu.
- npx tsc --noEmit — PASS; istniejąca konfiguracja TypeScript, bez uruchamiania builda.
- npm run contracts:check — PASS; wygenerowane kontrakty aktualne.
- php -l — PASS dla sześciu zmienionych/nowych plików: class-wedding-config.php, class-wedding-sections.php, class-catalog.php, class-site-validator.php, class-site-service.php, microsite-core.php. PHP z konfiguracji LocalWP udostępnionej w Open site shell.

Nie uruchamiano lint/build/verify, przeglądarki, screenshotów, podglądu, Playwright, testów integracyjnych, regresji ani pomiarów. Nie dodano zestawu testów. Nie wykonano wdrożenia ani nowej paczki produkcyjnej. Wcześniejsze paczki 0.7.1 nie zawierają W1.

Sprawdzenie składni, schematu i typów NIE potwierdza działania runtime, zapisu/odczytu HTTP, normalizacji DST ani braku regresji istniejących typów. Te kontrole wymagają osobnego zlecenia. Wcześniejsze raporty PASS nie dotyczą W1.

Następny krok: W2 — bezpieczne media i modularny edytor sekcji, dopiero na osobne zlecenie. Decyzje, braki i ogólny plan W2–W6: docs/WEDDING.md. Zachowano zastane niecommitowane zmiany audytu stagingu; W1 nie kończy ani nie potwierdza poprzedniego audytu.

## Wedding W2 — 2026-11-03

W kodzie zakończono modularny edytor wedding i wspólne media. Narzędzie administratora na /app/sites („Administrator tools · Wedding development”) tworzy projekt przez istniejący POST /sites i otwiera /app/sites/{id}. canDevelopWedding pochodzi z bieżącej sesji WordPressa, a backend nadal wymaga manage_options oraz create_ms_sites. Katalog publiczny i blokada publikacji development pozostają bez zmian.

WeddingFields korzysta z dotychczasowego DraftEditor: sesji, odczytu, nazwy projektu, pełnego PATCH, błędów, dirty state i ochrony wyjścia. WeddingDetails, PageSections, SectionForms/ListSectionFields oraz wspólne Fields rozdzielają dane pary/miejsc, listę sekcji i 14 jawnych formularzy. Move up/down oraz enabled zachowują ID/content; hero/footer są zablokowane. Powtarzalne listy mają stabilne ID, limity, dodawanie/usuwanie/kolejność. Usunięcie używanego miejsca wymaga potwierdzenia wyczyszczenia referencji, bez usuwania harmonogramu. Appearance jest tylko odczytem ustawień development. Zamiast makiety/iframe wedding wyświetla się „Visual preview will be available in the next stage”. Nie dodano renderera, animacji/fontów, adaptera RSVP, płatności lub zmiany presetów.

MediaService/MediaController i MediaPicker obsługują upload, paginowaną bibliotekę właściciela projektu, rozwiązanie URL/rozmiarów przez WP, wybór i usunięcie referencji, alt per użycie. Zasób wymaga autora i markera modułu zgodnych z właścicielem projektu; historyczne i cudze attachmenty są odrzucane. Jawny REST nonce, sesja, edit_ms_sites i dotychczasowe prawa projektu chronią endpointy. Aplikacyjne attachmenty są również wykluczone ze standardowego REST biblioteki WP; dostępne DTO przechodzą przez trasę projektu. Walidacja referencji jest w create/update, prywatnym preview i przed utworzeniem snapshotu. Nie nadano upload_files ani praw administracyjnych klientom.

Limity w jednym miejscu: JPEG/PNG/WebP, maksymalnie 10 MB z limitem hostingu, 25 MP, 50 plików modułu na właściciela (również w koszu). Sprawdzany jest rzeczywisty plik/MIME/rozszerzenie, wymiary przed dekodowaniem i dekoder WP; WP tworzy attachmenty/warianty. Limit liczby chroni blokada właściciela. Upload ma własny stan i blokadę wielokrotnego wysłania; EditorOperationsProvider blokuje zapis/edycję do potwierdzenia ID. Błąd zapisu szkicu nie usuwa uploadu ani formularza. Nie dodano trwałego usuwania plików, croppera, prywatnego storage i podpisanych URL. Pliki uploads nadal mogą być dostępne przez bezpośredni URL; informacja jest przy uploadzie i w docs/MEDIA.md.

Kontrole wykonane zgodnie z zakresem W2:

- php -l — PASS dla 7 zmienionych/nowych plików PHP: microsite-core.php, class-auth-service.php, class-publication.php, class-site-service.php, class-wedding-config.php, class-media-service.php i class-media-controller.php. Użyto PHP z konfiguracji LocalWP Open site shell.
- npx tsc --noEmit — PASS po poprawieniu typowania elementów list; bez builda.
- npm run contracts:check — PASS; typy W1 pozostają aktualne, nie wymagały regeneracji.
- Kontrola zmienionych JSON Schema — nie dotyczy: kontrakt wedding.v1.json i inne schematy nie zostały zmienione.

Nie uruchamiano przeglądarki, screenshotów, wizualnego podglądu, Playwright, testów integracyjnych, regresji, lint/verify/build ani pomiarów. Nie dodano testów. Nie utworzono projektu lub pliku w działającej bazie, nie uruchamiano uploadów, nie zmieniono motywu, rejestracji i praw publikacji. Nie restartowano Vite, nie przygotowano nowej paczki ani wdrożenia i nie wykonano commit/push.

**Działanie runtime, wygląd, uploady, izolacja HTTP, współbieżne limity, zapis/odczyt oraz regresja istniejących typów nie zostały zweryfikowane.** Składnia i typy nie stanowią takiego potwierdzenia. Szczegóły i ograniczenia: docs/WEDDING.md i docs/MEDIA.md.

Następny krok na osobne zlecenie: W3 — Modern Editorial, renderer wszystkich sekcji, trzy warianty hero, trzy palety i trzy pary fontów. Zakończono na W2.

## Wedding W3 — Modern Editorial — 2026-11-03

Zakończono w kodzie styl modern-editorial@1 i renderer wszystkich 14 sekcji: hero, invitation, countdown, venues, schedule, story, gallery, guest-info, travel, gifts, faq, rsvp, contact i footer. Kompozycje hero photo-full/split/typography wykorzystują wspólne dane; brak lub błąd zdjęcia przełącza je na typography. Renderer pomija wyłączone/puste opcjonalne sekcje, zachowuje kolejność/stabilne anchory, plain text, bezpieczne CTA/linki, natywne FAQ i jeden timer countdown z cleanupem. Nie importuje kont, routera ani klienta API.

Trzy palety: Ivory & Ink (ivory-ink), Sage & Linen (sage-linen), Rose & Cocoa (rose-stone); lokalne tokeny CSS, mobile-first i clamp. Pary fontów zachowują identyfikatory W1: editorial-serif = Cormorant Garamond/Manrope, modern-romantic = Libre Baskerville/Source Sans 3, timeless-classic = Playfair Display/Inter. Pobrano oficjalne źródła Google Fonts i oryginalne licencje SIL OFL 1.1. Lokalne subsety z zakresem Latin/Latin Extended (polskie znaki), serif 400 i sans 400–600, font-display:swap. Sześć WOFF2 ma łącznie 266 880 bajtów. Copyright/OFL i pinned źródła/SHA są w katalogu fonts; główne nazwy zmodyfikowanych fontów mają aliasy Microsite ME. Brak zewnętrznych fontów w runtime i preload-all.

Catalog/WeddingSections rozróżniają rendererImplemented=true od availability=development. Formularz development udostępnia trzy zaimplementowane palety/pary fontów/kompozycje hero, zachowując treść przy zmianie. Wejścia pozostają niewdrożone. Publiczny katalog nie ujawnia wedding, serwer nadal blokuje publikację także administratorowi.

Minimalny prywatny podgląd zapisanego szkicu korzysta z dotychczasowych /app/sites/{id}/preview, GET sites/{id}/preview, RendererFrame i TemplatePreview. API dla wedding wymaga dodatkowo administratora, a MediaService::preview_assets przygotowuje jedną ograniczoną listę DTO dla referencji aktywnych sekcji (do 42, z deduplikacją). Weryfikuje autora/marker/status/MIME/pliki, bez biblioteki i niedozwolonych URL. Brakujące zdjęcie jest pomijane; create/update nadal odrzuca niedozwolone referencje. Renderer nie wysyła osobnych żądań API zdjęć. Iframe zachowuje origin/source, CSP, sandbox, no-store i brak nonce/draft w URL; transport obsługuje ograniczone arrays/oneOf/media. Dla wedding akceptuje wyłącznie mode=saved. Nie wdrożono live synchronizacji niezapisanych zmian, demo i publicznej trasy testowej.

Kontrole uzgodnione na W3:

- php -l — PASS: class-media-service.php, class-site-service.php, class-catalog.php, class-wedding-sections.php. PHP z konfiguracji LocalWP Open site shell.
- npx tsc --noEmit — PASS; użyto obecnej konfiguracji, bez builda.
- npm run contracts:check — PASS; brak potrzeby regeneracji.
- Zmienione JSON Schema — nie dotyczy; schematy W1 pozostały bez zmian.

Pobranie/przygotowanie fontów nie było testem renderowania; źródłowe TTF i tymczasowe narzędzia FontTools/Brotli zostały usunięte, do aplikacji nie dodano zależności. Specyfikacja docs/styles/modern-editorial.md opisuje implementację, nie pomiary kontrastu, wydajności lub raport oględzin. Nie sprawdzano wyglądu glyphów na urządzeniu ani faktycznych requestów fontów.

Nie uruchamiano przeglądarki, screenshotów, Playwright, testów integracyjnych, regresji, lint/verify/build lub pomiarów. Nie tworzono danych projektu/mediów, nie resetowano bazy, nie zmieniono rejestracji, praw publikacji i motywu; nie restartowano istniejącego Vite. Nie wykonano wdrożenia, nowej paczki, commit/push. Nie dodano animacji/koperty/GSAP, aktywnego wedding RSVP, płatności, kolejnych stylów i galerii marketingowej. Istniejący packager wymaga dołączenia nowych font notices przed przyszłym wydaniem; W3 nie tworzy paczki produkcyjnej.

**Runtime, wygląd i responsywność NIE zostały zweryfikowane.** Nie potwierdzono runtime W1/W2, prywatnego HTTP/mediów i fallbacków, cleanupu timera na urządzeniu lub braku regresji birthday/basic. Poprawna składnia i typy nie są takim potwierdzeniem.

Dokumentacja: WEDDING.md, MEDIA.md, styles/modern-editorial.md, THIRD-PARTY-ASSETS.md oraz fonts/README.md i provenance.json. Następny krok W4 na osobne zlecenie: wejścia, pełna integracja podglądu, demo i presety. Zatrzymano się na W3.

## Wedding W4 — wejścia, live preview, demo i preset — 2026-11-03

Zakończono implementację W4 bez odblokowania wedding dla klientów lub publikacji. Appearance pobiera nazwy/opisy/opcje z chronionego rejestru backendu: trzy hero, trzy palety, trzy pary fontów i reveal/envelope/typography. Zmiany są lokalne i nie zapisują automatycznie szkicu. Preset jest fabryką wyłącznie nowego projektu, z nowymi ID, pustymi danymi osobowymi/listami i bez prywatnych attachmentId; PATCH nie przyjmuje presetId.

Oddzielna WeddingOpening wykorzystuje istniejący GSAP i jawny rejestr: reveal około 1 s, envelope około 2.6 s, typography około 1.55 s. Projekt przewiduje closed/opening/opened, ochronę wielokrotnego Open, Skip/Escape, kontekst/timeline cleanup, pauzę hidden, inert/focus/scroll restoration, reduced motion bez animacji i fallback po błędzie. Animowane są całe linie Unicode, nie sztuczny podział znaków. Zmiana danych podczas intro kończy animację; Replay nie jest zmianą treści i uruchamia bieżący wariant. Nie ma wspólnego stanu „skipped” dla projektów.

WeddingLivePreview korzysta z tego samego RendererFrame/TemplatePreview/ModernEditorial, domyślnie otwartego, z Mobile/Desktop i Replay. POST sites/{id}/media/resolve jest administracyjną operacją read-only z nonce i prawami projektu, limitem 42 ID/body 2 MB oraz autoryzacją właściciela. Zwraca ograniczone media i opcjonalnie znormalizowany przez istniejący EventDate draft. UI stosuje debounce 180 ms, abort/sequence/klucz wyboru i kopiuje jedynie aktualne potwierdzone terminy, nie starą treść. Nie wysyła per-image requestów z renderera. Saved preview pozostaje osobną operacją.

Demo administracyjne jest na /app/sites/new?demo=modern-editorial. Używa istniejącego mechanizmu demo/iframe i tego samego renderera, pozwala wybierać opcje i Replay, nie tworzy Site i nie zapisuje odpowiedzi. Fixture PHP jest osobna od pustych defaults. Publiczny katalog nie ujawnia wedding; prywatne dane, media i demo mają serwerowe ograniczenia development. Aktywne RSVP/publikacja/płatności pozostają poza W4.

### Jawnie zlecone przygotowanie danych

Utworzono przez SiteService i jego pełną walidację **Site 12 — Modern Editorial — Olivia & James**, właściciel: istniejący administrator radek (ID 1). Wybrano split / Ivory & Ink / Cormorant Garamond + Manrope / reveal. Termin: 17 lipca 2027 o 15:00 Europe/London, UTC ustalone przez normalizer. Wszystkie 14 sekcji ma oryginalne treści angielskie; contact wyłączone z zachowaniem danych example.com. Miejsca są fikcyjne, bez rezerwacji i partnerstw.

Zaimportowano trzy lokalne zdjęcia Eugenii Remark z Pexels przez wspólny MediaService/WordPress Media Library, z kontrolą formatów, limitów, autora i markera modułu; przypisano do właściciela, zachowano pochodzenie/licencję i alt per użycie. Import jest ograniczony do WP-CLI administratora i zaufanych kluczy, nie dowolnych ścieżek/URL. Nie zastępuje normalnego uploadu i nie kopiuje zdjęć do zwykłych pustych presetów. Źródła/atrybucja/SHA: assets/wedding-demo/README.md i sources.json, THIRD-PARTY-ASSETS.md. Zdjęć nie oglądano w ramach testu wizualnego.

- Edytor: http://celebrations.local/app/sites/12
- Prywatny podgląd: http://celebrations.local/app/sites/12/preview
- Demo: http://celebrations.local/app/sites/new?demo=modern-editorial
- Powtórne przygotowanie w LocalWP Open site shell: `wp microsite wedding-example --user=radek`. Zwykłe uruchomienie nie nadpisuje oznaczonego przykładu; `--force` jawnie zastępuje jego nazwę i cały draft. Nie uruchamiano drugiego przebiegu/force jako testu.

Komenda zakończyła się sukcesem. To operacja przygotowania danych, **nie test runtime/UI/animacji**. Nie zmieniono innych istniejących projektów, rejestracji, motywu, praw publikacji ani snapshotów. Nie resetowano żadnej bazy i nie tworzono bazy testowej. Uploady/derywaty pozostają ignorowanymi danymi WP, nie źródłami w Git.

### Kontrole uzgodnione na W4

- php -l — PASS dla 10 nowych/zmienionych PHP: microsite-core.php, data/wedding-demo.php, class-media-service.php, class-site-service.php, class-site-validator.php, class-wedding-sections.php, class-wedding-controller.php, class-wedding-presets.php, class-wedding-demo.php i class-wedding-example.php. PHP z konfiguracji LocalWP Open site shell.
- npx tsc --noEmit — PASS po zmianach; bez produkcyjnego builda.
- npm run contracts:check — PASS; wygenerowane kontrakty aktualne.
- Kontrola zmienionych JSON Schema — nie dotyczy: nie zmieniano kontraktu W1 lub innych schematów. Nowy sources.json to dokumentacja assetów, nie kontrakt danych klienta.

Sprawdzono oficjalną dokumentację GSAP context/timeline/revert/pause oraz konkretne strony zdjęć i licencję Pexels. Nie instalowano nowej biblioteki animacji. Nie uruchamiano przeglądarki, screenshotów, Playwright, testów integracyjnych, regresji, lint/verify/build ani pomiarów. Nie dodano zestawu testów, nie restartowano istniejącego Vite, nie wykonano paczki, commit/push ani wdrożenia. Istniejący packager wymaga przed przyszłym wydaniem dołączenia JPEG demo i nowych licencji/font notices; starsze paczki nie zawierają W4.

**Runtime, animacje, wygląd i responsywność nie zostały zweryfikowane.** Nie sprawdzano HTTP/wyścigów/klawiatury/StrictMode/HMR/reduced motion w przeglądarce, faktycznego cleanupu lub idempotencji w drugim przebiegu ani regresji pozostałych typów. Składnia/typy oraz jednorazowe przygotowanie danych nie są takim potwierdzeniem.

Zaktualizowano WEDDING.md, MEDIA.md, specyfikację stylu i dokumentację źródeł/licencji. Następny krok: W5 na osobne zlecenie — adapter istniejącego RSVP i gotowość publikacji/pełny przepływ. Zakończono na W4.


## Wedding W5 — 2026-11-04

Zaimplementowano adapter współdzielonego RSVP, opcjonalne ustawienia sekcji z kompatybilnością starych danych, edytor, prawdziwy publiczny formularz i istniejący panel odpowiedzi. Jedna odpowiedź obejmuje całą uroczystość. WeddingReadiness jest częścią wspólnej walidacji publikacji; stabilne ścieżki otwierają sekcje edytora. Wedding/modern-editorial pozostają development i ukryte dla klientów. Jawne administrativePublication pozwala administratorowi z capabilities, dostępem i prawem projektu świadomie publikować. Snapshot obejmuje sections/entrance; publiczne metadata/media korzystają ze snapshotu, bez biblioteki i wyłączonych treści.

Pierwotny załącznik ograniczał W5 do kontroli statycznych. Bieżąca dodatkowa prośba użytkownika „a pozniej zweryfikuj Runtime, animacje, wygląd i responsywność” rozszerzyła zakres o poniższe ukierunkowane sprawdzenie. Nie deklarujemy pełnej regresji W6.

### Wykonane kontrole

- PASS — php -l 13 plików W5: microsite-core.php; class-rsvp-config/context/service; class-wedding-config/readiness/demo; class-site-presentation/validator; class-catalog/publication/public-page; data/wedding-demo.php. PHP w środowisku LocalWP.
- PASS — wedding.v1.json: jsonschema Draft4Validator.check_schema; generowane kontrakty aktualne (contracts:generate/check).
- PASS — npx tsc --noEmit, npm run lint, npm run build. Publiczny renderer testowano z manifestu, bez klienta Vite w dokumencie. Istniejącego Vite nie restartowano.
- PASS — 11 istniejących grup RSVP (realne sesje HTTP WordPress i Chromium): kompatybilność urodzin, daty/DST, walidacja, Origin, idempotencja/concurrency, sekrety, właściciel, deadline, wyłączenie/wycofanie/usuwanie, rate limits i formularz/panel. Pierwszy przebieg zatrzymał się na 403 w teście zmieniającym tymczasowy WP_HOME; kolejny ukończył wszystkie 11 grup. Nie uznajemy pierwszej próby za PASS ani problemu za trwale naprawiony.
- PASS — 6 ukierunkowanych grup wedding na istniejącej chronionej bazie microsite_test_430601248a09bf6c: ukryty katalog i odmowa klientowi; niepełny preset i starsze RSVP; publikacja administracyjna syntetycznego projektu; anonimowy snapshot/metadata/media; zapis i idempotentny replay; niezależny szkic; wyłączenie/wycofanie i usuwanie przez sekret; deadline/DST; odmowa cudzych mediów; kompatybilność basic-page.
- PASS — publiczny formularz wedding w Chromium: wysłanie, sukces, prywatny link zarządzania i suma w panelu. Wyłącznie syntetyczne dane izolowanej bazy.
- PASS — live editor zmienia imię w iframe bez zapisu; envelope closed/opening/opened, inert, Open/Skip/Replay i usunięcie overlay; typography/reveal Replay; przywrócone przewijanie; demo; reduced motion; brak pageerror. Pierwsza próba UI miała błędny locator Email, poprawiono tymczasowy scenariusz na Email address; po poprawce ukończono 6 grup.
- PASS — ukierunkowany wygląd/responsywność Chromium 1440×1000 i 390×844: zdjęcie hero ładuje się, brak poziomego overflow; obejrzano screenshoty hero i RSVP obu szerokości oraz kopertę w edytorze. Pola i tekst mieszczą się, typografia/paleta są spójne. Dotyczy jednego zestawu split/Ivory & Ink/editorial-serif, nie wszystkich kombinacji.
- PASS — odczyt stanu LocalWP Site 12 po kontroli: owner 1, published=false, brak prawa publikacji. Nie nadano prawa, nie opublikowano ani nie nadpisano szkicu.

Runner korzystał z zabezpieczeń istniejącego run-integration: różna DB_NAME, marker projektu, prefiks ms_test_, lock i tymczasowy wp-config. Nie utworzono kolejnej bazy i nie zmieniono wp-config.php strony. Osieroconą blokadę usunięto dopiero po potwierdzeniu braku zapisanego PID. Tymczasowy runner służył jednorazowej kontroli; nie dodano stałej suity. Zrzuty pozostają ignorowane w app/test-results/wedding-w5. Wbudowane połączenie przeglądarkowe było niedostępne, użyto istniejącego lokalnego Chromium/Playwright. Serwer i konfigurację posprzątano; baza pozostała do ponownego użycia.

Oględziny wykryły nieaktualny tekst W4 nad prawdziwym formularzem, mówiący o braku zapisu. Poprawiono źródłową fixture i ponownie sprawdzono ślubny przepływ. Istniejący przykład 12 celowo zachowuje dawny tekst oraz brak settings — przed publikacją administrator musi poprawić tekst i włączyć skonfigurowane RSVP albo wyłączyć sekcję. Nie uruchamiać --force dla tej korekty, bo nadpisuje cały draft.

### Ograniczenia i następny krok

Nie sprawdzano rzeczywistych urządzeń, Safari/Firefox, całej macierzy wariantów, każdej sekcji przy każdej szerokości, wydajności, długiego działania, wyścigów StrictMode/HMR ani hostingu produkcyjnego/staging. Nie wykonano pełnej regresji kont/bezpieczeństwa innych modułów. Widoki testowe nie potwierdzają wyglądu zmodyfikowanego ręcznie Site 12. Pierwszy błąd testu Origin pozostaje obserwacją do ustabilizowania w W6. PHPCS/CI pozostają długiem. Nie przygotowano paczki; packager wymaga assetów W4 przed wydaniem. Nie wykonano commit/push.

Edytor: http://celebrations.local/app/sites/12. Odpowiedzi: http://celebrations.local/app/sites/12/responses. Przykład nie ma publicznego linku, bo jest nieopublikowany. Procedura publikacji: docs/WEDDING.md i docs/PUBLICATION.md. Zakończono W5; W6 wymaga osobnego zlecenia.


## Ergonomia edytora — 2026-11-04

Wspólny EditorView otwiera teraz pełny obszar roboczy bez stałej kolumny podglądu. Na trasie edycji ukryto globalny sidebar 250 px, usunięto limit main 1100 px i zmniejszono odstępy powłoki. Pola mają adekwatne limity: zwykłe input/select do 40rem, textarea do 56rem, liczby/terminy do 22rem. Pozostają kolory i typografia panelu.

Pasek projektu grupuje Back to projects, nazwę, stan, Preview i Save changes. Korzysta z istniejącego zapisu i jego blokad. Stany: Unsaved changes, Saving, Saved po odpowiedzi backendu, Save failed; początkowy odczyt pokazuje No unsaved changes. Kreator urodzinowy zachowuje kroki i Save & continue z tą samą operacją zapisu.

Wedding ma zwijaną nawigację danych wspólnych, sekcji po stabilnych ID i Appearance. Widoczne są aktualny wybór i On/Off. Enabled i Move up/down znajdują się przy wybranej sekcji. Na węższym ekranie Sections otwiera listę; wybór zamyka ją i oddaje focus formularzowi. Błędy gotowości nadal wybierają właściwy obszar.

Preview jest lokalnym trybem tego samego workspace, bez nawigacji, zapisu lub publikacji. Montuje rzeczywiste iframe dopiero po kliknięciu, z bieżącymi danymi; wedding wtedy rozwiązuje media i terminy. Mobile/Desktop zmieniają rzeczywisty viewport istniejącego iframe; live intro jest początkowo pominięte, Replay pozostaje świadomy. Preview RSVP jest demonstracyjne. Back to editing odmontowuje iframe wraz z zasobami renderera, przywraca zapisane scrollX/Y oraz focus na Preview. Nadrzędny formularz pozostaje zamontowany, co zachowuje draft, wybrany krok/sekcję i walidację. Nie zmieniano protokołu postMessage, uprawnień, kluczy projektu/sesji ani ochrony opuszczania edytora. Preview saved draft zachowano osobno.

Kontrole na bieżące zlecenie:

- PASS — istniejący typecheck: npx tsc --noEmit po końcowych zmianach TypeScript.
- PHP i kontrakty — nie zmieniano; php -l i contracts:check nie uruchamiano.
- Nie uruchamiano builda, lint, przeglądarki, screenshotów, Playwright ani testów integracyjnych. Nie dodano zestawu testów.

Runtime, faktyczne zachowanie focusu/scrolla, wygląd, responsywność i cleanup nowego workspace nie były sprawdzane w przeglądarce. Wyniki wcześniejszego W5 nie stanowią weryfikacji tej korekty. Nie zmieniano danych projektów/bazy ani istniejącego Vite. Nie wykonano commit/push. Plan W1–W6 pozostaje bez zmian; zakończono korektę ergonomii, W6 nadal na osobne zlecenie.
