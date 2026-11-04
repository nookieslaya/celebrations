# Moduł wedding

Przed pracą nad modułem przeczytaj ten dokument. Po zmianach aktualizuj bieżący stan i następny krok. Jedyna lista zadań pozostaje w specs/001-app-shell/tasks.md; wyniki kontroli zapisujemy w docs/STATUS.md.

## Kontekst i stan W5 — 2026-11-04

Platforma obsługuje różne ministrony. Wedding jest nowym typem wspólnego Site, nie osobną aplikacją. Konta, właściciel projektu, REST CRUD, capabilities, zapis, publikacja, snapshoty, linki i QR pozostają wspólne. Nie tworzymy nowego CPT ani tabel ślubnych, endpointów CRUD, płatności lub dowolnego page buildera. Nie ma edycji kodu, własnego CSS, marginesów ani elementów wewnątrz sekcji.

W1 dostarcza kontrakt wedding.v1.json, generowane typy WeddingDraft / DraftBySiteType.wedding, rejestry WeddingSections oraz normalizer WeddingConfig. Catalog rejestruje wedding i modern-editorial ze stanem development. Definicje są dostępne kodowi backendu przez Catalog::type(), template() i wedding_registry(). Nie są metadanymi publicznego katalogu.

W2 dostarcza modularny edytor Wedding i wspólną usługę mediów. W3 dodaje renderer Modern Editorial dla 14 sekcji, trzy kompozycje hero, trzy palety i trzy lokalne pary fontów oraz prywatny podgląd zapisanego szkicu dla administratora. W4 dodaje trzy wejścia, live preview, demo administracyjne i fabrykę presetu. W5 dodaje współdzielone RSVP i jawną publikację administracyjną development opisaną poniżej. W1–W4 w chwili ukończenia miały wyłącznie uzgodnione kontrole statyczne; utworzenie przykładu poniżej jest osobną operacją przygotowania danych, nie weryfikacją runtime, wyglądu lub responsywności.

## Faktyczna integracja ze wspólną aplikacją

POST /sites, GET /sites/{id}, lista oraz PATCH /sites/{id} korzystają z dotychczasowych SiteService, SiteValidator i SiteRepository. Utworzenie szkicu developerskiego przez POST wymaga oprócz zwykłych zabezpieczeń create_ms_sites, sesji/nonce i dodatkowo manage_options. Zwykły klient otrzyma 403 przy bezpośrednim POST wedding; brak kafelka nie jest jedyną ochroną. Administrator otwiera listę projektów /app/sites, rozwija „Administrator tools · Wedding development”, wpisuje nazwę i wybiera „Create development wedding”. Narzędzie korzysta z istniejącego POST /sites bez draft, więc backend stosuje defaults W1. W W4 narzędzie wysyła presetId=modern-editorial, a backend materializuje pusty preset i generuje nowe ID. Po utworzeniu otwiera /app/sites/{id}; projekt można później otworzyć z listy. Przycisk korzysta z canDevelopWedding w bootstrapie sesji, a serwer nadal wymaga manage_options i create_ms_sites. Nie zmieniamy publicznego katalogu. W razie nieznanego wyniku tworzenia kolejne wysłanie jest blokowane do sprawdzenia listy, bez automatycznego ponawiania.

GET i PATCH zachowują kontrolę własności/uprawnionego administratora. PATCH zmienia nazwę i/lub zastępuje cały draft; nie scala tablic ani obiektów, nie zmienia typu, wersji czy właściciela. Sam zapis nie sortuje sekcji, nie usuwa ich treści i nie stosuje ponownie presetu. Zmiana enabled albo variant zachowuje przesłany content; klient kolejnego etapu musi przesyłać cały stan.

Publiczny Catalog pomija wedding i modern-editorial również dla zalogowanego administratora. Od W5 oba wpisy mają jawne administrativePublication=true i zaimplementowany renderer. Wyłącznie administrator z manage_options, publish_ms_sites, dostępem do projektu i nadanym prawem publikacji może świadomie opublikować gotowy szkic. Inne typy development pozostają zablokowane. Publiczny odczyt gotowego snapshotu nie wymaga sesji. Snapshoty istniejących typów nie są przepisywane.

Stan development jest jawną definicją serwera, nie przełącznikiem klienta ani parametrem URL. Włączenie wedding dla klientów wymaga ukończenia etapów i świadomej zmiany definicji. Istniejące typy bez pola availability zachowują dostępność.

## Model danych

Systemowe schemaVersion=1 i templateVersion=1 są wyłącznie w istniejącej kopercie Site. Nie dublujemy ich w draft. Identyfikator modern-editorial wybiera zaufaną definicję szablonu, a nie ścieżkę lub klasę.

Draft zawiera:

- content.couple.firstName i secondName (po 100 znaków), heading (200); pusty heading jest opcjonalnym wspólnym nagłówkiem.
- content.event: localDateTime, timeZone IANA, startsAt UTC zgodnie z obecnym EventDate. Pusty termin jest poprawny w szkicu i czyści startsAt; UTC klienta nigdy nie jest źródłem prawdy. Początkowa strefa UTC jest technicznym ustawieniem, nie odgadywaną lokalizacją klienta.
- content.venues: do 12 miejsc z id, kind ceremony/reception/other, name (200), address (500), opcjonalnym event w tym samym modelu daty. Jedno miejsce może obsługiwać całą uroczystość; nie wymagamy dwóch adresów ani różnych nazw. Rodzaj other może opisywać wspólne miejsce. Sekcje wskazują te same identyfikatory.
- appearance.palette i fontPair: kontrolowane identyfikatory wyglądu.
- entrance.variant: kontrolowany wariant wejścia.
- sections: od 2 do 14 instancji; id, type, variant, enabled i content. Kolejność tablicy określa układ.

Brak fikcyjnych imion, dat, miejsc i zdjęć w defaults. Listy treści są puste, teksty puste. Domyślna kompozycja zawiera wszystkie 14 sekcji: włączone hero, invitation, venues i footer, pozostałe wyłączone. W W4 dane demonstracyjne otrzymają odrębne fixtures, nie będą wartościami zapisywanymi klientowi.

EventDate normalizuje wspólny termin, opcjonalne terminy miejsc i pozycje harmonogramu. Zachowane są obecne reguły IANA, kalendarza, zakresu 1900–2200, odrzucania luk i powtórzeń DST. Harmonogram używa pełnego lokalnego terminu ze strefą i UTC; nie parsuje opisowej godziny typu „wieczorem”. W W2 UI może dziedziczyć strefę głównego wydarzenia jako wybór początkowy, ale nie może zastąpić normalizera ani kopiować głównego terminu do sekcji countdown/hero.

## Kontrakty sekcji i limity

Każdy obiekt ma additionalProperties=false. Teksty są plain text; wspólna polityka SiteValidator odrzuca HTML, zakodowane HTML i niedozwolone znaki sterujące. Akapity pozostają znakami nowej linii; sposób bezpiecznego renderowania ustalimy w W3, bez interpretacji HTML. Wszystkie identyfikatory mają 1–64 znaki i wzorzec ^[a-z][a-z0-9-]{0,63}$.

| Typ | Content / limity |
| --- | --- |
| hero | Opcjonalne photo, subtitle do 300 znaków, CTA none/rsvp/venues/schedule; kompozycja w variant: photo-full/split/typography. Imiona i termin wyłącznie ze wspólnych danych. |
| invitation | heading 160, text 6000. |
| countdown | heading 160, odczyt wspólnego terminu. |
| venues | heading 160, do 12 unikalnych venueIds wskazujących istniejące miejsca. |
| schedule | heading 160, do 30 items: id, event, title 160, description 1500, opcjonalny venueId. |
| story | heading 160, text 8000, opcjonalne photo. |
| gallery | heading 160, do 40 photos w kolejności: id, attachmentId, alt 240. |
| guest-info | heading 160, do 20 items: id, title 160, text 3000. |
| travel | heading 160, description 4000, do 20 items: id, name 160, description 3000, opcjonalny url. |
| gifts | heading 160, text 4000, do 12 links: id, label 160, url. Bez obsługi płatności i dedykowanych pól bankowych. |
| faq | heading 160, do 30 items: id, question 300, answer 4000. |
| rsvp | heading 160, text 3000, stałe module=shared-rsvp; to odwołanie kontraktu, nie działająca integracja. |
| contact | heading 160, do 12 contacts: id, name 160, opcjonalne email (format email, do 254) i phone (do 40, cyfry/spacje/+ na początku/nawiasy/myślnik). |
| footer | text 500. |

Photo to obiekt attachmentId (dodatnia liczba całkowita) i alt (do 240). Pole photo może być całkiem pominięte. Nie przechowujemy ścieżek plików lub dowolnych URL zdjęć. Linki travel/gifts mają do 2048 znaków, wymagają bezwzględnego HTTP(S), hosta i poprawnego URL bez credentials, backslashy, spacji i znaków sterujących; serwer ich nie pobiera. Renderer ma w przyszłości użyć bezpiecznych atrybutów linków i nie wstawiać HTML.

Reguły układu: hero obowiązkowo pierwsze i enabled=true; footer ostatnie i enabled=true. Pozostałe typy mogą być pomijane, wyłączane i przestawiane. Maksymalnie jedna instancja typu. Id instancji jest niezależne od indeksu; zmiana kolejności nie nadaje nowych id. Backend odrzuca duplikaty id i typów sekcji, id miejsc oraz id pozycji w obrębie listy. Id pozycji może powtarzać się w innej, niezależnej sekcji. Odwołania do nieistniejących miejsc są odrzucane także w wyłączonej sekcji; usuwanie używanego miejsca w W2 musi jawnie zaktualizować odwołania, bez cichego kasowania treści.

Schemat wykorzystuje ograniczone arrays i oneOf z jednoznacznym type dla content każdej sekcji. Generator rozszerzono o Array<T> i unie oneOf. Wspólna ścisła kontrola integer/boolean przechodzi teraz również przez elementy tablic i pasującą gałąź oneOf, aby tekstowy attachmentId nie był przyjmowany jako liczba.

## Rejestry i preset

WeddingSections::definitions wyprowadza kontrakt, defaults i warianty z JSON Schema. Dodaje nazwę, canDisable i pozycję first/movable/last. WeddingSections::style_registry definiuje opcje, nadal wszystkie availability=development. W3 dodaje rendererImplemented=true dla wariantów sekcji, palet, par fontów i stylu/presetu Modern Editorial; od W4 wejścia również mają rendererImplemented=true, lecz dostępność wedding nadal jest development. Ta flaga opisuje implementację renderera, nie dostępność dla klienta lub zgodę na publikację:

- Palety: ivory-ink, sage-linen, rose-stone.
- Pary fontów: editorial-serif = Cormorant Garamond + Manrope, modern-romantic = Libre Baskerville + Source Sans 3, timeless-classic = Playfair Display + Inter. W3 dostarcza lokalne WOFF2 i oryginalne licencje OFL.
- Wejścia: reveal, envelope, typography.
- Hero: photo-full, split, typography; pozostałe sekcje mają default.
- Preset modern-editorial: początkowy układ/aktywność, warianty, paleta ivory-ink, fontPair editorial-serif, wejście reveal.

Preset składa istniejące sekcje. Nie zawiera klientowskich treści, nie kopiuje renderera i nie jest stosowany ponownie przy PATCH/GET. Późniejsza zmiana definicji nie nadpisze zapisanych projektów. Nie ma przełączania presetów istniejącego projektu. RendererImplemented nie oznacza publicznej dostępności. W4 zawiera renderer i trzy wejścia, ale wedding pozostaje developerskie, bez aktywnego RSVP i publikacji.

## Media W2

W2 zawiera wspólny moduł MediaService/MediaController i customowy MediaPicker, bez nadawania klientom upload_files. Szczegóły autoryzacji, formatów, limitów, URL i operacji: docs/MEDIA.md. Kod jest ukończony, ale uploadu nie uruchamiano w runtime.

Biblioteka jest zakreślona właścicielem projektu, a nie aktualnym administratorem. Pokazuje wyłącznie attachmenty tego modułu z odpowiadającym właścicielem. Podpinanie zasobu sprawdzane jest po normalizacji w SiteService podczas tworzenia/zapisu szkicu, w zbiorczym resolverze prywatnego podglądu oraz w wspólnej operacji publikowania. Podgląd pomija niedostępny asset, bez ujawnienia jego URL; zapis nadal odrzuca taką referencję. Nie akceptujemy historycznych/obcych attachmentów przez samą znajomość ID. Standardowe pliki uploads mogą być publiczne przez bezpośredni URL — nie zapewniamy prywatnego storage.

## RSVP i podgląd: stan oraz dalsza integracja

Działa współdzielony moduł RSVP z tabelami, sekretami gości, uprawnieniami, idempotencją, ograniczeniami i odczytem snapshotu. Obecnie capability funkcji wynika z features typu; RsvpService/RsvpConfig i frontend oczekują content.event oraz content.rsvp ze strukturą urodzinową. Wedding nie ma aktywnej funkcji rsvp i nie uruchamia tego modułu.

W W5 trzeba dodać adapter kontekstu wydarzenia/konfiguracji do istniejącego modułu i zdecydować o jednym źródle globalnego włączenia RSVP względem enabled sekcji oraz CTA. Bez kopiowania tabel, sekretów, endpointów, zasad uprawnień i deadline/DST. Pierwsza integracja obejmie całą uroczystość, nie osobne wydarzenia. W1 zapisuje wyłącznie odwołanie shared-rsvp i teksty sekcji; nie przesądza konfiguracji terminu odpowiedzi.

Rzeczywisty podgląd używa wspólnego rejestru lazy rendererów oraz izolowanego iframe z walidacją origin/source i struktury wiadomości. W3 rozszerzyło transport o tablice/oneOf i ograniczone DTO previewMedia; W4 obsługuje saved/live/demo, zachowując origin/source, handshake i restrykcyjną strukturę. Backend GET sites/{id}/preview sprawdza dostęp do projektu i dodatkowo manage_options, normalizuje zapisany szkic, a MediaService::preview_assets rozwiązuje tylko wskazane zdjęcia włączonych sekcji. Pozostałe typy nie dostają nowego pola. Nie dodajemy drugiej makiety ani publikacji szkicu na /s/ dla podglądu. W4 dostarcza live synchronizację i demo opisane poniżej; publikacja pozostaje wyłączona.

## Plan kolejnych etapów

W1 (ukończony): fundament danych, rejestry i walidacja oraz połączenie ze wspólnym zapisem. Zakończony w kodzie, tylko kontrole statyczne; brak potwierdzenia runtime.

W2 (ukończony w kodzie): wspólne media oraz modularny edytor, włączanie sekcji i zmiana kolejności ze stabilnymi id. Wykorzystuje wspólne konta, zapis i dirty state; wykonano jedynie kontrole statyczne.

W3 (ukończony w kodzie): Modern Editorial, renderer wszystkich sekcji, trzy warianty hero, trzy palety i trzy lokalne pary fontów z licencjami. Minimalny prywatny podgląd zapisanego szkicu; bez potwierdzenia runtime.

W4 (obecny, ukończony w kodzie): trzy wejścia, live preview, demo administracyjne oraz fabryka presetu. Dodatkowo osobny wypełniony projekt przykładowy na wyraźną prośbę użytkownika.

W5 (następny, osobne zlecenie): adapter istniejącego RSVP dla całej uroczystości, reguły gotowości publikacji i pełny przepływ klienta. Obecny snapshot zapisuje content i appearance dotychczasowych typów; przed publikacją wedding trzeba rozszerzyć wspólną kopertę snapshotu o jego sections/entrance i ich odczyt, bez kopiowania systemu publikacji lub zmiany istniejących snapshotów w tle. W2 świadomie tego nie wdraża. Dopiero po zakończeniu funkcji można jawnie udostępnić wedding.

W6: dokładne testy, przegląd wizualny i staging wyłącznie na osobne zlecenie.

Później: kolejne presety i warianty sekcji, wiele wydarzeń i osobne RSVP, imienni członkowie rodziny, języki, album, księga gości i płatności. Nie implementujemy ich automatycznie.

## Rozszerzanie

Nowy wariant sekcji wykorzystuje istniejący content, dodaje zaufaną definicję wariantu/stan dostępności oraz renderer; nie wymaga nowego CRUD. Zmiana struktury content wymaga świadomej oceny kompatybilności kontraktu, nie ukrytej migracji.

Nowy preset składa istniejące sekcje i warianty, wybiera styl i początkowy układ. Nie kopiuje backendu i nie modyfikuje istniejących projektów. Docelowy wybór presetu musi oddzielić inicjalizację nowego projektu od potencjalnie destrukcyjnego przełączania istniejącego.

Nowy rodzaj ministrony używa wspólnego Site, ma własny kontrakt, definicję katalogu i edytora oraz rejestr renderera. Nie musi mieć daty, miejsc ani RSVP; wedding nie jest nowym kontraktem bazowym całej platformy.

Nierozstrzygnięte: ewentualny prywatny storage i przyszły cykl życia plików, adapter i konfiguracja RSVP, finalne reguły publikacji wymagające zdjęć lub danych oraz wybór presetów. Usuwanie referowanych miejsc w W2 wymaga potwierdzenia i czyści wyłącznie referencje. Są to decyzje kolejnych etapów, nie przeszkody do zapisu niekompletnego szkicu W1.


## Edycja W2

WeddingFields jest zarejestrowany we wspólnym rejestrze edytorów, bez urodzinowych kroków. Wspólny DraftEditor odpowiada za odczyt, nazwę, zapis pełnego draft przez PATCH, błędy, porównanie dirty state, ochronę wyjścia i sesję. Nowy EditorOperationsProvider blokuje zapis i zmiany formularza w trakcie uploadu oraz uwzględnia niezakończony upload w ochronie wyjścia. Nie ma równoległego magazynu lub automatycznego zapisu wedding.

Wedding details edytuje parę, wspólny nagłówek, datę/strefę i miejsca. Zmiana czasu czyści lokalne startsAt; kanoniczne UTC ustala dopiero dotychczasowy EventDate na serwerze. Terminy miejsc i harmonogramu korzystają z tych samych pól i normalizera. Szkic może być niepełny; dane strukturalnie niepoprawne, błędne daty/DST lub niebezpieczne URL są odrzucane przez backend. Nowy link gifts wymaga uzupełnienia poprawnego HTTP(S) URL albo usunięcia pozycji przed zapisem — nie zmieniano kontraktu W1.

Page sections wybiera sekcję według jej stabilnego ID. Move up / Move down działają przez natywne przyciski, bez biblioteki drag-and-drop, i nie przekraczają hero/footer. Przestawienie zachowuje ID i aktywny formularz, zmienia tylko lokalną tablicę sections. Wyłączenie zachowuje treść i miejsce w tablicy. Nie ma duplikowania ani trwałego usuwania sekcji. Jeżeli w poprawnym szkicu W1 brakuje sekcji opcjonalnej, można dodać jeden egzemplarz z kontraktowych defaults, bez powielania typu. ListFields zachowuje id pozycji przy edycji/kolejności, udostępnia dodawanie i usuwanie pozycji oraz pilnuje limitów z kontraktu.

Przy usuwaniu miejsca edytor wskazuje jego użycia, również w wyłączonych sekcjach. Dopiero potwierdzenie usuwa miejsce oraz venueIds w venues i venueId w pozycjach schedule. Nie usuwa pozycji harmonogramu, dat, tytułów ani pozostałej treści. Zmiana dotyczy szkicu, nie snapshotów.

Hero/story/gallery używają tego samego MediaPicker. Alt jest zapisywany przy konkretnym użyciu, nie globalnie na pliku. Galeria dodaje pozycję dopiero z potwierdzonym attachmentId, pozwala ją przestawiać i usuwać referencję. Błąd zapisu nie czyści formularza ani nie usuwa uploadu.

Od W3 Appearance udostępnia trzy zaimplementowane palety i pary fontów; hero udostępnia trzy kompozycje. Od W4 Appearance ma także wybór wejścia; wszystkie opcje i opisy pochodzą z backendowego rejestru. RSVP edytuje wyłącznie heading/text z W1, z informacją o połączeniu w W5. Od W3 przycisk Preview saved draft otwiera rzeczywisty zapisany szkic, za pośrednictwem istniejącego iframe i lazy renderera. Od W4 edytor ma rzeczywisty live preview bieżących danych i osobny Preview saved draft. Nie tworzymy tekstowej makiety.

Aby dodać formularz dla istniejącego typu sekcji, rozszerz jawny switch w SectionForms lub ListSectionFields, korzystając z wygenerowanej unii WeddingSection/SectionOf i wspólnych TextField, EventFields, ListFields oraz MediaPicker. Limity pobieraj z kontraktu przez model.ts. Nie generuj całego UI automatycznie ze schematu i nie dodawaj drugiego zapisu/konta. Nowe pole produktu wymaga osobnej decyzji o kontrakcie, a nie tylko formularza.

W2 został zakończony w kodzie; W3 opisano poniżej. Żaden z tych etapów nie potwierdza działania runtime, bezpieczeństwa HTTP lub wyglądu; dokładne testy zostają na osobne zlecenie.


## Modern Editorial W3

Specyfikacja implementacji: docs/styles/modern-editorial.md. To opis zamierzonego zachowania kodu, nie raport wizualnej oceny. Typografia ma duże szeryfowe imiona i użytkowy sans, kolory Ivory & Ink / Sage & Linen / Rose & Cocoa mapowane na istniejące ivory-ink / sage-linen / rose-stone. Nie zmieniano kontraktu lub istniejących danych.

Rejestr renderers/registry.ts zawiera modern-editorial@1. Renderer otrzymuje WeddingDraft i ograniczoną listę MediaAsset, a sekcje wybiera przez jawny sections/registry.tsx. Hero ma kompozycje photo-full, split i typography z tego samego content. Brak/utrata zdjęcia daje wariant typograficzny. Sekcje są w zapisanej kolejności, enabled=false zachowuje dane, a opcjonalne puste treści są pomijane. Countdown ma własny timer/cleanup i używa już potwierdzonego UTC, bez drugiego parsera DST. Linki mają kontrolowane protokoły, mapy nie używają iframe, a FAQ korzysta z details/summary. RSVP to tylko opis i informacja o W5.

Zdjęcia nie są pobierane po jednym z API przez renderer. SiteService::preview przygotowuje dla administratora dodatkowe previewMedia ze wspólnego MediaService, wyłącznie dla używanych aktywnych sekcji, po kontroli właściciela/markera. Brakujący lub niedozwolony plik nie ma DTO i nie ujawnia URL. Iframe dostaje same referencje i rozwiązane rozmiary, nie bibliotekę/nonce/sesję. Photo używa srcset/sizes, wymiarów i lazy loading poza hero. Uploads nadal nie są prywatnym storage; CSP podglądu dopuszcza standardowe zasoby tego samego originu.

Jak otworzyć: administrator tworzy/otwiera projekt z narzędzia development, uzupełnia treść i zdjęcia, zapisuje Save draft, następnie klika Preview saved draft. Trasa /app/sites/{id}/preview ma kontrolę dostępu, REST nonce i dodatkową kontrolę administratora po stronie API dla wedding. Kod nie został otwarty w przeglądarce w W3. Zmiany niezapisane nie trafiają do podglądu; standardowy wybór Save and preview korzysta ze wspólnego PATCH.

Fonty pobrano z oficjalnego google/fonts z przypiętą rewizją; lokalne subsety z polskimi znakami, serif 400 i sans 400–600, font-display:swap, bez runtime CDN/preload-all. Każda rodzina ma zachowaną licencję OFL; zmodyfikowane fonty mają własne główne nazwy Microsite ME. Źródła/licencje/SHA: renderers/wedding-modern-editorial/fonts/ i docs/THIRD-PARTY-ASSETS.md.

RendererImplemented=true nie zmienia availability=development, publicznego katalogu ani SiteValidator::publishable. Nie włączono publicznej strony wedding, wejść, live preview niezapisanych danych, demonstracji, marketingowej galerii lub aktywnego RSVP. Nie uruchomiono builda; stare paczki nie zawierają W3. Przed przyszłym wydaniem trzeba dołączyć wszystkie nowe OFL/provenance do paczki runtime.

W3 zakończono; aktualny zakres W4 opisano poniżej. Runtime, wygląd i responsywność pozostają bez osobnej weryfikacji.


## W4 — wejścia, podgląd, demo i preset

### Rejestry i wybory

WeddingSections::editor_options jest źródłem nazw, opisów i dozwolonych identyfikatorów hero/palet/fontów/wejść, wyprowadzanych z rejestrów i schematu W1. Chroniony GET /microsites/v1/development/wedding zwraca te opcje, metadane dozwolonego presetu i osobne dane demonstracyjne. React nie utrzymuje drugiej listy opcji: AppearanceFields otrzymuje je z serwera. Usunięto nieużywaną statyczną listę etykiet W3. Wybór hero zmienia variant właściwej sekcji; pozostałe pola pozostają w appearance/entrance. Nie usuwa to treści ani nie zapisuje automatycznie projektu.

Wszystkie trzy wejścia są zaimplementowane dla wszystkich trzech kompozycji hero. Nie dodano kombinacji wymagającej dodatkowych ograniczeń. Dostępność development, ukryty katalog, administracyjny dostęp do danych/mediów i blokada publikacji pozostają po stronie backendu.

### Warstwa wejść

WeddingOpening jest osobną warstwą wokół jednego renderera. Otrzymuje WeddingDraft, token mediów i PreviewContext, bez kont/routera/API. Jawny openings/registry.ts wybiera tylko znane implementacje GSAP. Reveal odsłania elementy hero około 1 s bez modalnej blokady. Envelope ma osobną kieszeń/klapkę/kartę, widoczne imiona i przyciski Open invitation / Skip intro; otwarcie trwa około 2.6 s. Typography animuje całe linie imion i linię przez około 1.55 s, bez dzielenia znaków Unicode. Nie skopiowano koperty urodzinowej i nie dodano konfetti/audio/scroll-jackingu.

Stany to closed/opening/opened. Timeline i gsap.context są sprzątane przy zmianie cyklu, unmount/StrictMode/HMR, a active pauzuje ten sam timeline. Skip/Escape kończy także rozpoczętą animację. Modal blokuje focus pod spodem przez inert i aria-hidden, ogranicza Tab do kontrolek oraz przy zakończeniu przenosi focus na h1 bez wymuszonego scrolla. Poprzednie style overflow są przywracane. Reveal nie blokuje strony. Reduced motion daje od razu otwartą treść, bez 3D/przemieszczeń; preferencja jest obserwowana i listener usuwany. Błąd inicjalizacji/cleanup i limit awaryjny 5 s dla aktywnej animacji odsłaniają treść. Cała strona nie jest domyślnie ukryta opacity:0.

Nie ma wspólnego zapisu „intro skipped” ani trwałego pomijania między projektami. Stan jest lokalny dla zamontowanego podglądu, a Replay działa niezależnie. Replay uruchamia bieżący wariant; zmiana treści/mediów/palety/kolejności podczas intro bezpiecznie je kończy, bez przejmowania focusu z formularza i bez startowania kolejnego timeline. Key renderera/sekcji nie zależy od JSON konfiguracji; JSON służy wyłącznie rozpoznaniu zmiany, nie remountowi.

### Live preview i niezapisane media

WeddingLivePreview używa istniejących LivePreview/RendererFrame/TemplatePreview. Mobile ma faktyczny viewport 390×844, Desktop 1440×900; zmienia się viewport iframe, nie tylko szerokość karty. Formularz pozostaje zamontowany przy Edit/Preview. Live jest domyślnie otwarte; Replay opening nie zmienia draft. Zapisany podgląd nadal jest osobnym GET/trasą i pokazuje wyłącznie zapisane dane.

POST sites/{id}/media/resolve jest chronioną, read-only operacją administratora z nonce, edit_ms_sites i kontrolą projektu. Przyjmuje maks. 42 wybrane ID oraz opcjonalny bieżący draft (limit body 2 MB). Rozwiązuje tylko dozwolone zasoby właściciela; brak/cudzy plik nie ma URL. Dodatkowo normalizuje poprawny strukturalnie draft przez istniejący SiteValidator/WeddingConfig/EventDate, nie przez drugi parser czasu. Żadna część operacji nie zapisuje projektu/snapshotu.

Klient debouncuje żądanie o 180 ms i wiąże wynik z zestawem ID/terminów; cleanup abortuje request, a licznik i zgodność klucza odrzucają spóźnione odpowiedzi. Do iframe trafiają wyłącznie aktualnie wybrane autoryzowane DTO, nie biblioteka. Z odpowiedzi normalizera kopiowane są tylko pasujące potwierdzone terminy, nigdy stara treść sekcji. Tekst, enabled, kolejność i wygląd aktualizują się od razu w lokalnym podglądzie. Nowe zdjęcie pojawia się po rozstrzygnięciu dostępu przed zapisem; w oczekiwaniu jest fallback. Przy niepoprawnym szkicu normalizacja dat może być niedostępna, ale media nadal są rozwiązywane; niepotwierdzony lokalny termin jest zwykłym tekstem z etykietą unconfirmed, bez zgadywania UTC/DST. Countdown używa wyłącznie potwierdzonego UTC.

### Preset i demo

WeddingPresets::create materializuje wyłącznie zarejestrowany preset. POST /sites przyjmuje opcjonalny presetId tylko przy tworzeniu wedding, bez dodatkowego draft; wersje nadal ustala serwer. Każda instancja sekcji dostaje nowe UUID, listy klienta są puste i nie ma attachmentId z demo. Brak presetId w dawnym żądaniu wedding bez draft również korzysta z tej fabryki. PATCH nie przyjmuje presetId; nie ma przełączania presetu istniejącego projektu lub współdzielonych mutowalnych obiektów.

Demo: /app/sites/new?demo=modern-editorial, dostępne z Administrator tools. Korzysta z tego samego mechanizmu demo/iframe i renderera, ma wybór wszystkich opcji, Mobile/Desktop i Replay. Nie tworzy Site, nie zapisuje odpowiedzi i nie publikuje. Fixture PHP jest osobna od defaults; stockowe lokalne zdjęcia mają syntetyczne identyfikatory wyłącznie w DTO demonstracji. Publiczny katalog nadal nie zawiera wedding, a endpoint danych demo wymaga administratora i aktualnego nonce.

### Osobny kompletny projekt Olivii i Jamesa

Na dodatkowe wyraźne zlecenie przygotowano **Site ID 12 — Modern Editorial — Olivia & James**, właściciel: istniejący administrator radek (ID 1). Edytor: http://celebrations.local/app/sites/12. Prywatny podgląd: http://celebrations.local/app/sites/12/preview. Demo bez Site: http://celebrations.local/app/sites/new?demo=modern-editorial.

Projekt ma split / Ivory & Ink / Cormorant Garamond + Manrope / reveal. Uroczystość: 17 lipca 2027, 15:00 Europe/London; UTC ustala EventDate. Wszystkie 14 sekcji mają oryginalne przykładowe treści po angielsku; contact jest wyłączone, zachowując dane z example.com, pozostałe tworzą kompletną stronę. Miejsca i ustalenia są fikcyjne, bez realnych rezerwacji/partnerstw. Hero/story/gallery korzystają z trzech przypisanych właścicielowi zdjęć z W4. Źródła/autorzy/licencje: assets/wedding-demo/README.md, sources.json i THIRD-PARTY-ASSETS.md.

Komenda w **LocalWP → Open site shell**, z katalogu WordPressa:

```bash
wp microsite wedding-example --user=radek
```

Komenda korzysta ze wspólnego SiteService i jego pełnej walidacji oraz z MediaService::import_sample, ograniczonego do zarejestrowanych plików demonstracyjnych w CLI właściciela-administratora. Import przechodzi te same limity/MIME/dekoder/quota co upload, używa WordPress Media Library i zachowuje marker pochodzenia/licencji. To jawnie zlecony wyjątek dla jednego przykładu; standardowy preset nie importuje zdjęć jako uploadów klienta.

Idempotencja: dedykowany lock, marker `_microsite_example_key`, brak nowej kopii i brak nadpisania istniejącego przykładu przy zwykłym uruchomieniu. Skasowany/przeniesiony do kosza oznaczony projekt nie jest zastępowany nowym. Importy również mają marker źródła i są ponownie używane. Jeżeli pierwsze przygotowanie przerwie się po utworzeniu szkicu, marker zostaje, a dokończenie wymaga jawnej opcji. **--force zastępuje cały draft/nazwę wyłącznie oznaczonego przykładu, także późniejsze ręczne zmiany**, i wymaga jego pierwotnego właściciela:

```bash
wp microsite wedding-example --user=radek --force
```

Nie uruchamiano --force ani ponownego przebiegu jako testu idempotencji. Utworzenie ID 12 i import zdjęć były operacją przygotowania danych, nie testem wyglądu/animacji. Innych projektów, rejestracji, praw publikacji i snapshotów nie zmieniano.

W chwili ukończenia W4 runtime, animacje, wygląd i responsywność nie były zweryfikowane. Bieżące wyniki W5 znajdują się w docs/STATUS.md. W6 pozostaje osobnym zleceniem dokładnych testów/stagingu.


## W5 — RSVP i kontrolowana publikacja

RsvpContext jest minimalnym backendowym adapterem siteType; frontend używa rsvp/configuration.ts. Odczytują te same pola: birthday zachowuje content.rsvp, wedding używa jedynej sekcji rsvp. Nie powstała nowa tabela, endpoint odpowiedzi ani drugi formularz. Istniejący GuestForm, sekrety, idempotencja, rate limiting, zarządzanie i usuwanie danych pozostają wspólne.

Jedynym enabled jest sections[rsvp].enabled. Funkcjonalne ustawienia są opcjonalnym content.settings: maxPartySize, deadlineLocal i kanoniczne deadlineAt. Brak settings w starym szkicu/snapshotcie oznacza wyłączone przyjmowanie odpowiedzi; nie ma migracji istniejących danych. Jawne włączenie w edytorze inicjalizuje defaults kontraktu. Nagłówek i tekst pozostają w tej samej sekcji. Jedna odpowiedź dotyczy całej uroczystości, a liczba obejmuje osobę odpowiadającą. Bez posiłków, dodatkowych pytań lub listy zaproszonych.

Deadline korzysta ze wspólnego EventDate/RsvpConfig i strefy głównego wydarzenia. Podany termin podlega regułom DST i nie może wypadać po rozpoczęciu wydarzenia. Niepełny szkic można zapisać; wymagania kompletności dotyczą publikacji. Brak deadline zamyka RSVP na początku wydarzenia. Jedynym źródłem publicznej konfiguracji jest snapshot: zapis szkicu nie zmienia formularza, dopiero aktualizacja publikacji. Wyłączenie sekcji w opublikowanej konfiguracji lub wycofanie strony blokuje nowe odpowiedzi/zmiany. Wcześniejsze odpowiedzi pozostają w panelu, a poprawny sekret nadal pozwala je usunąć.

Demo i prywatny podgląd wykorzystują istniejący formularz demonstracyjny, bez zapisów do backendu. Publiczny GuestForm otrzymuje tokeny Modern Editorial i opcjonalną nazwę pary. Dostęp do panelu odpowiedzi nie zależy od aktualnego enabled sekcji.

### Reguły gotowości

Wspólny SiteValidator wywołuje WeddingReadiness po walidacji kontraktu, referencji i terminów. Wymagane: oba imiona, potwierdzony główny termin/strefa, zaimplementowany szablon, warianty, paleta, fonty i wejście. Kolejność/unikalność sekcji i odwołania do miejsc podlegają dotychczasowemu WeddingConfig. Wszystkie referencje zdjęć, także wyłączonych sekcji, są sprawdzane względem biblioteki właściciela przy zapisie i prywatnym sprawdzaniu gotowości.

Włączone sekcje wymagają: invitation — tekstu; story — tekstu lub zdjęcia; venues — przynajmniej jednego wybranego miejsca z nazwą i adresem; schedule — pozycji z tytułem i potwierdzonym terminem oraz kompletnych wskazanych miejsc; gallery — zdjęcia; FAQ — pełnej pary pytanie/odpowiedź; guest-info — tytułu i tekstu każdej pozycji; travel — opisu lub kompletnych opcji; gifts — tekstu lub podpisanych poprawnych linków; contact — nazwy i emaila lub telefonu; RSVP — ustawień. Hero nie wymaga zdjęcia, countdown korzysta z głównego terminu, footer może być pusty. Wyłączone sekcje zachowują dane i nie wymagają kompletnej treści, lecz nadal obowiązują kontrakt i bezpieczeństwo linków/kontaktów.

Błędy zawierają stabilne ścieżki z ID sekcji/elementu. Panel tłumaczy je na nazwy i pozwala otworzyć odpowiednią sekcję. Istniejący read-only GET projektu zwraca publication.fieldErrors/canPublish; sprawdzanie nie zapisuje szkicu.

### Dostęp administracyjny i dane publiczne

Administrator otwiera /app/sites/12, świadomie konfiguruje brakujące RSVP lub wyłącza jego sekcję i zapisuje szkic. Panel publikacji pokazuje wymagane poprawki. Po nadaniu prawa projektu przez istniejące CLI w Open site shell (`wp microsite publication-right 12 grant --user=radek`) może użyć Publish, potem aktualizacji/wycofania. **W ramach W5 nie nadano tego prawa i nie opublikowano projektu 12.** Zwykły klient nadal nie widzi wedding w galerii, nie tworzy go przez API i nie publikuje bezpośrednim wywołaniem.

Snapshot przechowuje pełny zwalidowany draft wraz z sections i entrance. Publiczna projekcja pomija wyłączone sekcje i nieużywane miejsca; rozwiązuje wyłącznie zdjęcia wskazane przez aktywne sekcje snapshotu, z kontrolą właściciela. Nie udostępnia biblioteki ani aktualnego szkicu. Usunięte/cudze pliki nie otrzymują URL i renderer używa fallbacku. Metadata tytułu/opisu pochodzą z danych pary i zaproszenia. URL /s/, noindex, cache, QR i prawa pozostają wspólne.

Edytor: http://celebrations.local/app/sites/12. Panel odpowiedzi: http://celebrations.local/app/sites/12/responses. Nie ma publicznego URL przykładu, ponieważ nie został opublikowany.

Na dodatkowe bieżące zlecenie użytkownika rozszerzono pierwotne ograniczenie kontroli W5 o ukierunkowaną weryfikację runtime, animacji, wyglądu i responsywności. Dokładne wyniki i ograniczenia: docs/STATUS.md. W6 (pełna regresja, urządzenia i staging) nie został rozpoczęty.

Uwaga dla starszego Site 12: zachował tekst demonstracyjny W4 nad RSVP i brak settings. Przed publikacją zmień tekst ręcznie oraz świadomie włącz ustawienia lub wyłącz sekcję. Nie używaj --force do drobnej korekty.


## Korekta ergonomii edytora po W5 — 2026-11-04

Wspólna powłoka edytora korzysta z całej szerokości aplikacji i ukrywa globalny sidebar na trasie edycji. Główny pasek zawiera powrót do projektów, nazwę, stan zapisu, Preview i Save changes. Usunięto stałą kolumnę podglądu. Jest to korekta ergonomii przed dalszą pracą, bez zmiany planu W1–W6.

Wedding ma zwijaną nawigację: dane wspólne, sekcje po stabilnych ID ze stanem On/Off i Appearance. Akcje enabled/reorder dotyczą wybranej sekcji. Na węższym ekranie Sections otwiera listę, a wybór oddaje miejsce formularzowi. Kreator birthday zachowuje dotychczasowe kroki.

Preview przełącza wspólny workspace na pełnoekranowy widok wewnątrz aplikacji. Iframe i resolver mediów są montowane dopiero po kliknięciu, z bieżącym niezapisanym draftem. Back to editing odmontowuje podgląd, przywraca scroll i focus. Formularz pozostaje zamontowany w ukrytej powierzchni; jego dane, wybór i błędy nie są pobierane ponownie. Mobile/Desktop, świadomy Replay, reduced motion i protokół bezpieczeństwa iframe pozostają istniejące. Preview saved draft zachowano jako osobną akcję.

W tym zadaniu wykonano wyłącznie typecheck; nie weryfikowano runtime, wyglądu ani responsywności nowego workspace. Poprzednie wyniki W5 dotyczą wcześniejszego układu. Szczegóły: docs/STATUS.md. Następny etap nadal W6 na osobne zlecenie.
