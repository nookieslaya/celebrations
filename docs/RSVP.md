# RSVP — etap 6

## Kontrakt i zgodność

RSVP jest funkcją `rsvp` typu birthday-invitation w Catalog. basic-page jej nie obsługuje. Opcjonalne `content.rsvp` rozszerza kompatybilnie schemaVersion 1: starsze szkice i snapshoty bez tego pola nadal są poprawne i oznaczają wyłączone RSVP. Nie przeprowadzamy przepisywania starych konfiguracji ani snapshotów. Nowe defaults i formularz edytora korzystają z tego samego JSON Schema; generator TS obsługuje także boolean.

Pola: enabled (boolean), maxPartySize (integer 1–20, domyślnie 5), deadlineLocal (opcjonalny lokalny termin w strefie wydarzenia) i kanoniczny deadlineAt (UTC). Techniczny limit 20 dotyczy pojedynczej odpowiedzi razem z odpowiadającym, nie pojemności wydarzenia. RsvpConfig używa EventDate i jego walidacji IANA, dat kalendarza, luk/powtórzeń DST. UTC klienta nie jest zaufane. Deadline wymaga daty wydarzenia i nie może być po jej rozpoczęciu; zmiana daty/strefy ponownie sprawdza zależność. Puste deadlineLocal czyści deadlineAt. Konfiguracja enabled może pozostać w niepełnym szkicu; dotychczasowa gotowość publikacji wymaga poprawnego wydarzenia.

Publiczne RSVP czyta wyłącznie snapshot. Save changes nie zmienia publicznego formularza; potrzebne Publish/Update live page. Prywatny preview nie montuje publicznego formularza i nie wysyła RSVP.

## Czas i cykl życia

Nowa odpowiedź, zmiana i wycofanie wymagają opublikowanego, obsługującego RSVP projektu, enabled=true oraz czasu serwera ściśle wcześniejszego od terminu i rozpoczęcia wydarzenia. Gdy deadline jest pusty, granicą jest start wydarzenia. Równość oznacza zamknięcie. Brak automatycznego wycofania samej publikacji po wydarzeniu.

Wycofanie odpowiedzi to no i 0 uczestników. Zamknięcie/wyłączenie RSVP lub wycofanie zaproszenia blokuje tworzenie i zmiany (także wycofanie odpowiedzi), ale nie odczyt własnej odpowiedzi i jej trwałe usunięcie przez sekret. Republish zachowuje odpowiedzi. Zmniejszenie limitu nie modyfikuje zapisanych danych; kolejna zmiana na yes musi spełniać nowy limit. Zmiana na no pozostaje możliwa, gdy RSVP jest otwarte.

## Baza i migracja

Idempotentna migracja `microsite_rsvp_database_version=1`, uruchamiana na init, tworzy przez dbDelta dwie tabele InnoDB z rzeczywistym prefiksem WordPressa:

- `<prefix>microsite_rsvp`: id, project_id, guest_name (1–80 znaków), attending (yes/no), party_size, secret_hash SHA-256, creation_key SHA-256, creation_fingerprint SHA-256, created_at/updated_at UTC. Unique secret_hash i (project_id,creation_key); indeks (project_id,attending,id).
- `<prefix>microsite_rsvp_deleted`: project_id, hash klucza operacji, expires_at; bez imienia, sekretu i treści odpowiedzi. Unique (project_id,creation_key) i indeks daty wygaśnięcia.

Nie zbieramy emaila, telefonu, pytań wrażliwych, IP ani user-agent w odpowiedzi. Nie ma ORM; przygotowane SQL i jawne DTO. Dezaktywacja nie usuwa danych. Trwałe usunięcie projektu najpierw blokuje nowe RSVP i transakcyjnie usuwa jego odpowiedzi oraz znaczniki. Błąd zatrzymuje usunięcie projektu. Nie ma automatycznej retencji odpowiedzi.

ProjectLock współdzielony z publikacją serializuje publikowanie/wycofanie, RSVP i usuwanie projektu w tej samej domenie blokady. Zajęta blokada daje 409. Unikalność operacji jest dodatkowo wymuszona w DB. Usunięcie odpowiedzi i zapis znacznika są jedną transakcją.

## Idempotencja i sekret

Przeglądarka generuje niezależny sekret 256-bitowy i 256-bitową część losową klucza operacji przez Web Crypto getRandomValues. Klucz ma format `timestampUTCSeconds.hex64`, sekret `hex64`. Nie używamy Math.random. Sekret jest przekazywany przez X-Microsite-RSVP, klucz przez Idempotency-Key; nie ma ich w query string.

Serwer zapisuje wyłącznie hash sekretu i klucza oraz fingerprint pierwotnego, zwalidowanego payloadu (name, attending, partySize), a nie późniejszej edycji. Zgodne ponowienie zwraca ten sam id, również po zamknięciu/wycofaniu zaproszenia, nie tworząc rekordu. Ten sam klucz z innym sekretem lub pierwotnym payloadem daje 409. Równoczesne żądania są serializowane i zabezpieczone unikalnym indeksem; po busy można ponowić te same wartości.

Nowa operacja może być maksymalnie 24 godziny stara; tolerancja zegara przyszłego: 60 sekund. Istniejący zgodny wynik może być potwierdzony później. Po usunięciu rekord z danymi osobowymi znika trwale, a nieosobowy znacznik blokuje spóźnione ponowienia przez 48 godzin. Po jego wygaśnięciu oryginalny klucz i tak jest zbyt stary do nowego utworzenia, więc usunięte dane nie wracają. Znaczniki sprząta najbliższe godzinowe WP-Cron po expires_at; bez ruchu/wywołania crona sprzątanie może się opóźnić. Nie jest to retencja odpowiedzi.

Do czasu potwierdzenia wysłania sessionStorage przechowuje tylko sekret i klucz (bez imienia i payloadu), aby odtworzyć tożsamość operacji po błędzie/odświeżeniu. Sukces je usuwa. W bieżącej karcie można ponowić identyczne odpowiedzi po utracie HTTP. Po odświeżeniu trzeba ponownie wpisać te same dane, aby potwierdzić operację; backend rozpoznaje niezgodny payload. Nie wolno automatycznie zastępować niepewnej operacji nowymi kluczami. Przy zablokowanym sessionStorage ponowienie w pamięci bieżącej karty nadal działa, ale zamknięcie karty może utracić sekret.

## Prywatny link

`/rsvp/manage/#{responseId}.{secret}` jest niezależną, produkcyjną powłoką bez kont, analityki, Vite i zewnętrznych zasobów. Działa po wycofaniu zaproszenia i nie zawiera jego treści. Fragment nie trafia do serwera; aplikacja przekazuje sekret wyłącznie w dedykowanym nagłówku API. Dokument/API mają no-store i Referrer-Policy: no-referrer; dokument ma też restrykcyjne CSP. Samo otwarcie niczego nie modyfikuje.

Gość może odczytać jedną odpowiedź, zmienić ją/wycofać w otwartym RSVP oraz świadomie potwierdzić trwałe usunięcie. Usunięcie czyści pasującą operację sessionStorage i fragment bieżącego adresu. Błędny sekret, brak i usunięty rekord mają taki sam 404 oraz komunikat. Nie wyszukujemy po imieniu ani nie łączymy osób o tych samych imionach. Organizator nie widzi sekretów.

Gość musi zachować/skopiować link; każdy posiadacz może zarządzać tą odpowiedzią. Nie ma emaila, resetu sekretu ani odzyskiwania linku. Publiczne zaproszenie nie zawiera sekretów ani danych odpowiedzi. Nie należy konfigurować logowania tych nagłówków w proxy/APM.

## API

Namespace `/wp-json/microsites/v1`:

| Metoda i ścieżka | Autoryzacja / wynik |
| --- | --- |
| GET public/sites/{publicId}/rsvp | Publiczny stan otwarcia, limit, termin, strefa; bez listy i sum |
| POST public/sites/{publicId}/responses | Origin, X-Microsite-RSVP, Idempotency-Key; JSON name/attending/partySize/website (pusty honeypot). 201 lub replay 200 |
| GET rsvp/responses/{id} | Sekret; własny jawny DTO i aktualny stan RSVP |
| PATCH rsvp/responses/{id} | Sekret, Origin, JSON name/attending/partySize; reguły czasu i live limit |
| DELETE rsvp/responses/{id} | Sekret, Origin, puste body; trwałe usunięcie także po zamknięciu |
| GET sites/{id}/responses | Sesja, REST nonce, edit capability, właściciel lub uprawniony administrator |
| DELETE sites/{id}/responses/{responseId} | Jak lista; weryfikowane przypisanie odpowiedzi do projektu |

Organizator nie edytuje odpowiedzi. Lista: page>=1, per_page 1–50 (domyślnie 20), attending pusty/yes/no, sort id DESC. summary yes/no/participants obejmuje cały projekt, niezależnie od filtra/paginacji. Błąd nie jest zastępowany fałszywymi zerami. DTO odpowiedzi: id, name, attending, partySize, createdAt, updatedAt. Żaden publiczny endpoint nie zwraca innych gości, właściciela ani statystyk.

Błędy: walidacja 400/422 z fields, payload 413, Origin/nonce 403, brak dostępu 404, zamknięcie/konflikt/zużyta lub przeterminowana operacja/blokada 409, limiter 429 z Retry-After, magazyn niedostępny 503. Odpowiedzi prywatne i błędy mają no-store.

## Ochrona i ograniczenia przed startem

Body <=2048 bajtów, ścisłe typy i dozwolone pola, name<=80 zwykłych znaków Unicode bez HTML/znaków sterujących, zależność yes=1..live limit i no=0. Publiczne modyfikacje wymagają dokładnego Origin strony, a obecny obcy Origin jest odrzucany także przy odczycie. CORS dla gościnnych tras nie udziela dostępu innym originom ani wildcard. Nie używamy anonimowego nonce WP jako autoryzacji.

Limiter SQL z atomowym incrementem działa dla anonimowych gości: 40 prób utworzenia / 10 minut, osobno 180 odczytów i 180 zmian / 10 minut. Klucz to krótko żyjący hash bezpośredniego REMOTE_ADDR, operacji i okna, nie wspólny user 0. Nie ufamy X-Forwarded-For. Limiter jest poza permission_callback, które WordPress może oceniać wielokrotnie w jednym żądaniu. Wspólne IP/NAT dzieli limit, rozproszone boty mogą go obchodzić, honeypot nie zatrzyma zaawansowanego spamu. Przed publicznym startem potrzebna ocena ruchu, zaufanego reverse proxy, ochrony na brzegu i monitoringu bez sekretów/danych osobowych. Nie dodano CAPTCHA.

HTTPS jest wymaganiem docelowego publicznego hostingu. LocalWP jest lokalnym podglądem, nie publicznym hostingiem. Przed startem nadal potrzebne są reset hasła i weryfikacja emaila organizatora, polityka przechowywania odpowiedzi/obsługi danych i przegląd ochrony antyspamowej. Nie ma listy zaproszonych, więc nie znamy liczby osób, które jeszcze nie odpowiedziały. Brak płatności, email/SMS, importu, CSV, uploadów, pytań niestandardowych i przypomnień.
