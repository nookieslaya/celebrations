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
