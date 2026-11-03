# Moduł wedding

Przed pracą nad modułem przeczytaj ten dokument. Po zmianach aktualizuj bieżący stan i następny krok. Jedyna lista zadań pozostaje w specs/001-app-shell/tasks.md; wyniki kontroli zapisujemy w docs/STATUS.md.

## Kontekst i stan W1 — 2026-11-03

Platforma obsługuje różne ministrony. Wedding jest nowym typem wspólnego Site, nie osobną aplikacją. Konta, właściciel projektu, REST CRUD, capabilities, zapis, publikacja, snapshoty, linki i QR pozostają wspólne. Nie tworzymy nowego CPT ani tabel ślubnych, endpointów CRUD, płatności lub dowolnego page buildera. Nie ma edycji kodu, własnego CSS, marginesów ani elementów wewnątrz sekcji.

W1 dostarcza kontrakt wedding.v1.json, generowane typy WeddingDraft / DraftBySiteType.wedding, rejestry WeddingSections oraz normalizer WeddingConfig. Catalog rejestruje wedding i modern-editorial ze stanem development. Definicje są dostępne kodowi backendu przez Catalog::type(), template() i wedding_registry(). Nie są metadanymi publicznego katalogu.

Nie ma edytora Wedding ani renderera Modern Editorial. Rejestr edytorów pozostaje bez wpisu wedding i korzysta z istniejącej obsługi niedostępnego edytora; rejestr rendererów nie wskazuje pozornego komponentu. Nie dodano uploadów ani adaptera RSVP. Wyniki składni i typów nie potwierdzają działania runtime.

## Faktyczna integracja ze wspólną aplikacją

POST /sites, GET /sites/{id}, lista oraz PATCH /sites/{id} korzystają z dotychczasowych SiteService, SiteValidator i SiteRepository. Utworzenie szkicu developerskiego przez POST wymaga oprócz zwykłych zabezpieczeń create_ms_sites, sesji/nonce i dodatkowo manage_options. Zwykły klient otrzyma 403 przy bezpośrednim POST wedding; brak kafelka nie jest jedyną ochroną. Administrator może przygotować szkic przez istniejące API, ale W1 nie daje interfejsu do tego działania i nie tworzy projektu automatycznie.

GET i PATCH zachowują kontrolę własności/uprawnionego administratora. PATCH zmienia nazwę i/lub zastępuje cały draft; nie scala tablic ani obiektów, nie zmienia typu, wersji czy właściciela. Sam zapis nie sortuje sekcji, nie usuwa ich treści i nie stosuje ponownie presetu. Zmiana enabled albo variant zachowuje przesłany content; klient kolejnego etapu musi przesyłać cały stan.

Publiczny Catalog pomija wedding i modern-editorial również dla zalogowanego administratora. SiteValidator::publishable odrzuca typ/szablon development przed przygotowaniem snapshotu. Dotyczy bezpośredniego API oraz administratora i nie zależy od posiadanego prawa publikacji. Prawa publikacji i rejestracja nie są modyfikowane. Istniejący publiczny odczyt snapshotu także korzysta z publishable, więc niegotowy typ nie uzyska publicznego renderowania. Snapshoty istniejących typów nie są przepisywane.

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

WeddingSections::definitions wyprowadza kontrakt, defaults i warianty z JSON Schema. Dodaje nazwę, canDisable i pozycję first/movable/last. WeddingSections::style_registry definiuje opcje, wszystkie availability=development:

- Palety: ivory-ink, sage-linen, rose-stone.
- Pary fontów: editorial-serif, modern-romantic, timeless-classic. To identyfikatory, bez jeszcze wybranych/załadowanych plików fontów.
- Wejścia: reveal, envelope, typography.
- Hero: photo-full, split, typography; pozostałe sekcje mają default.
- Preset modern-editorial: początkowy układ/aktywność, warianty, paleta ivory-ink, fontPair editorial-serif, wejście reveal.

Preset składa istniejące sekcje. Nie zawiera klientowskich treści, nie kopiuje renderera i nie jest stosowany ponownie przy PATCH/GET. Późniejsza zmiana definicji nie nadpisze zapisanych projektów. Nie ma przełączania presetów istniejącego projektu. Definicja nie oznacza dostępnej funkcji: żadna opcja wedding nie ma jeszcze produkcyjnego renderera.

## Media: stan i brakujące zabezpieczenia W2

Istnieją jedynie statyczne assety wtyczki i miniatury galerii, nie moduł klientowskich mediów. Klienci nie dostają upload_files. Nie ma uploadu, listy prywatnych zasobów, walidacji MIME/rozmiaru lub bezpiecznego resolvera attachmentId.

W W1 dodatni attachmentId jest tylko inertnym elementem szkicu. Nie potwierdzamy własności, istnienia ani dostępu; nie pobieramy attachment URL, metadanych lub obrazu. Brak renderera i blokada publikacji zapobiegają wykorzystaniu tej referencji do publicznego odczytu. Przed jakimkolwiek użyciem w W2/W3 potrzebna jest polityka właściciela/projektu i sprawdzenie dostępu dla każdego zasobu również przy zapisie, odczycie podglądu i publikacji. Samo istnienie wpisu attachment lub prawo do projektu nie wystarczą. Publiczne pliki standardowych uploadów WordPressa nie stają się prywatne przez prywatne DTO — strategię przechowywania i udostępniania trzeba rozstrzygnąć w W2.

## RSVP i podgląd: stan oraz dalsza integracja

Działa współdzielony moduł RSVP z tabelami, sekretami gości, uprawnieniami, idempotencją, ograniczeniami i odczytem snapshotu. Obecnie capability funkcji wynika z features typu; RsvpService/RsvpConfig i frontend oczekują content.event oraz content.rsvp ze strukturą urodzinową. Wedding nie ma aktywnej funkcji rsvp i nie uruchamia tego modułu.

W W5 trzeba dodać adapter kontekstu wydarzenia/konfiguracji do istniejącego modułu i zdecydować o jednym źródle globalnego włączenia RSVP względem enabled sekcji oraz CTA. Bez kopiowania tabel, sekretów, endpointów, zasad uprawnień i deadline/DST. Pierwsza integracja obejmie całą uroczystość, nie osobne wydarzenia. W1 zapisuje wyłącznie odwołanie shared-rsvp i teksty sekcji; nie przesądza konfiguracji terminu odpowiedzi.

Rzeczywisty podgląd już używa wspólnego rejestru lazy rendererów oraz izolowanego iframe z walidacją origin/source i struktury wiadomości. W4 musi rozszerzyć kontrolę transportu w preview/protocol.ts o nowe tablice i unie; dziś świadomie odrzuca nieobsługiwany wedding i nie ma renderera. Nie dodajemy drugiej makiety ani publikacji szkicu na /s/ dla podglądu.

## Plan kolejnych etapów

W1 (obecny): fundament danych, rejestry i walidacja oraz połączenie ze wspólnym zapisem. Zakończony w kodzie, tylko kontrole statyczne; brak potwierdzenia runtime.

W2 (następny): bezpieczna obsługa mediów oraz modularny edytor, włączanie sekcji i zmiana kolejności ze stabilnymi id. Należy wykorzystać wspólne konta, zapis i dirty state, bez kopiowania powłoki edytora.

W3: pierwszy styl Modern Editorial, renderer wszystkich sekcji, trzy warianty hero, trzy palety i trzy pary fontów z ustalonymi assetami/licencjami.

W4: trzy wejścia, integracja rzeczywistego podglądu, galerii, oddzielnych demonstracji i presetów.

W5: adapter istniejącego RSVP dla całej uroczystości, reguły gotowości publikacji i pełny przepływ klienta. Dopiero po zakończeniu funkcji można jawnie udostępnić wedding.

W6: dokładne testy, przegląd wizualny i staging wyłącznie na osobne zlecenie.

Później: kolejne presety i warianty sekcji, wiele wydarzeń i osobne RSVP, imienni członkowie rodziny, języki, album, księga gości i płatności. Nie implementujemy ich automatycznie.

## Rozszerzanie

Nowy wariant sekcji wykorzystuje istniejący content, dodaje zaufaną definicję wariantu/stan dostępności oraz renderer; nie wymaga nowego CRUD. Zmiana struktury content wymaga świadomej oceny kompatybilności kontraktu, nie ukrytej migracji.

Nowy preset składa istniejące sekcje i warianty, wybiera styl i początkowy układ. Nie kopiuje backendu i nie modyfikuje istniejących projektów. Docelowy wybór presetu musi oddzielić inicjalizację nowego projektu od potencjalnie destrukcyjnego przełączania istniejącego.

Nowy rodzaj ministrony używa wspólnego Site, ma własny kontrakt, definicję katalogu i edytora oraz rejestr renderera. Nie musi mieć daty, miejsc ani RSVP; wedding nie jest nowym kontraktem bazowym całej platformy.

Nierozstrzygnięte: prywatność i cykl życia plików, konkretny dobór fontów, adapter i konfiguracja RSVP, finalne reguły publikacji wymagające zdjęć lub danych, UX usuwania referowanych miejsc i wyboru presetów. Są to decyzje kolejnych etapów, nie przeszkody do zapisu niekompletnego szkicu W1.
