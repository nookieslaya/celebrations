# Birthday invitation — edycja i prywatny podgląd

To etap szkicu i prywatnego podglądu, nie produkt gotowy do sprzedaży. Nie ma publikacji, płatności, RSVP, QR, uploadów, zdjęć, muzyki ani AI.

## Kontrakt

Typ birthday-invitation ma schemaVersion 1. Szablon birthday-party ma templateVersion `"1"` (wersje szablonów są stringami w istniejącym API). Jedynym źródłem struktury, limitów, defaults i palety jest contracts/birthday-invitation.v1.json, z którego generuje się BirthdayInvitationDraft. Nowe pola liczbowe są generowane jako number i walidowane jako rzeczywiste JSON integer.

content zawiera celebrantName (0–80 znaków), opcjonalny age (integer 1–120), heading (do 120), message (do 600), event, venueName (do 120), address (do 240), opcjonalny dressCode (do 120) i dodatkowe additionalInfo (do 500). appearance.palette przyjmuje electric-citrus, pink-noir lub cobalt-pop. Tekst pozostaje plain text i jest renderowany przez JSX, bez HTML.

Szkic może być niekompletny: teksty mogą być puste, age może być pominięty, a lokalna data pusta. Wymagany jest komplet struktury content/appearance/event oraz poprawna strefa (domyślnie Europe/London). Nie zapisujemy stałej daty w schemacie. Renderer ukrywa niepodany wiek i puste opcjonalne sekcje; brak daty i miejsca otrzymuje jawny placeholder.

## Lokalny czas i moment UTC

Przykład event:

```json
{
  "localDateTime": "2027-07-10T19:30",
  "timeZone": "Europe/London",
  "startsAt": "2027-07-10T18:30:00Z"
}
```

localDateTime jest wartością datetime-local, bez ukrytej strefy przeglądarki. timeZone jest identyfikatorem IANA. Backend wylicza startsAt z pierwszych dwóch pól — przesłana przez klienta stara/poprawna składniowo wartość startsAt jest nadpisywana wynikiem, a nie uznawana za źródło prawdy. Przy pustej lokalnej dacie startsAt jest pustym stringiem. Po zapisie formularz otrzymuje cały kanoniczny szkic z odpowiedzi serwera.

EventDate sprawdza poprawność kalendarza, zakres lat 1900–2200, identyfikator strefy i możliwe offsety jej przejść. Zero pasujących momentów oznacza lukę przy przesunięciu zegara; dwa oznaczają powtórzoną godzinę. Oba przypadki zwracają 400 microsite_event_time_invalid z czytelnym komunikatem i wymagają wyboru innej godziny. Nie wybieramy po cichu pierwszego offsetu. Nie ma automatycznej korekty nieistniejącej daty. UTC zachowuje także sekundy wynikające z historycznych offsetów IANA (bez zaokrąglania do pełnej minuty). Testy obejmują London gap/fold 2027 oraz strefę Asia/Kathmandu z offsetem 45 minut.

Pary localDateTime/timeZone umożliwiają odtworzenie formularza niezależnie od strefy urządzenia, a startsAt określa zapisany moment. Renderer formatuje startsAt przez Intl.DateTimeFormat z jawnym timeZone. Przy zmianie reguł IANA po latach odczyt preview ponownie normalizuje datę według aktualnej bazy stref serwera; nie zamrażamy historycznego tzdb ani publikowanego snapshotu w tym etapie.

## Podgląd i ochrona

Adres: `/app/sites/{id}/preview`. Odczyt: `GET /wp-json/microsites/v1/sites/{id}/preview` z sesją i REST nonce. Istniejący SiteService sprawdza capability/własność i wersje oraz pełną konfigurację. Cudzy i nieistniejący projekt zwracają 404; administrator z odpowiednimi capabilities może odczytać cudzy szkic. Nie ma osobnego urodzinowego CRUD ani trasy /s/ dla szkiców.

Bezpośrednie żądanie HTML sprawdza natywną sesję przed powłoką aplikacji. Anonimowy użytkownik trafia do loginu z bezpieczną lokalną ścieżką powrotu, a cudzy szkic ma status 404. HTML nie zawiera treści projektu. API i dokument stosują no-store/private i noindex; nonce jest w prywatnym bootstrapie/nagłówkach, nigdy w URL.

Preview invitation otwiera ostatnio zapisany szkic. Dla dirty state pokazuje wyjaśnienie i Save and preview/Cancel. Save and preview korzysta ze wspólnego zapisu i dopiero po potwierdzeniu serwera przechodzi do preview. Błąd pozostawia użytkownika z jego danymi w edytorze. Nie ma otwierania starej wersji po nieudanym zapisie.

## Renderer i animacje

renderers/registry.ts mapuje zaufany templateId@templateVersion do lazy komponentu i oczekiwanego typu. BirthdayParty otrzymuje wyłącznie BirthdayInvitationDraft; nie importuje routera, API ani sesji. PreviewView obsługuje autoryzację/odczyt, pełnoekranową powłokę, loading/error i powrót do edytora. Nowy renderer wymaga wpisu w tym rejestrze, a nie kopiowania mechanizmów kont.

GSAP 3.15.0 jest przypięty w package.json/lockfile i bundlowany tylko w dynamicznym chunku szablonu, wraz z jego CSS. Login, lista i edytor nie pobierają go. Brak CDN, zewnętrznych zdjęć i dodatkowych fontów — typografia korzysta z systemowych Arial/Helvetica/sans-serif. Dekoracje i tekstura są CSS/tekstem, bez płatnych assetów.

Sceny: intro, reveal imienia/wieku z jednorazowym konfetti, treść zaproszenia, szczegóły w formie biletu i closing z opcjonalnym linkiem mapy generowanym z adresu. Intro wymaga kliknięcia lub klawiatury i ma Skip intro. Skrót Jump to details jest stale dostępny. Nie zapisujemy stanu intro w pamięci przeglądarki, więc nie istnieje współdzielony klucz ujawniający inny projekt. Focus po otwarciu przechodzi na nagłówek albo szczegóły. Dekoracje są aria-hidden, tekst nazw dzielony na słowa i grafemy.

Scroll pozostaje natywny: brak pinowania, scrubowania, przechwytywania wheel/touch lub blokady overflow body. Wejścia sekcji to ScrollTrigger once. GSAP matchMedia ze scope elementu grupuje timeliny i ScrollTrigger; revert w cleanup usuwa je przy unmount/HMR/zmianie preferencji. Flaga jednorazowego konfetti chroni przed ponownym efektem. prefers-reduced-motion od razu pokazuje komplet treści bez intro i konfetti; inicjalizacja animacji ma catch/revert/odtworzenie domyślnych czytelnych styli.

Oficjalne API sprawdzone przy implementacji: [matchMedia i cleanup](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/), [context/revert](https://gsap.com/docs/v3/GSAP/gsap.context()/), [ScrollTrigger once](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).

## Przykład i sprawdzanie

W panelu: Create a site → Birthday invitation → birthday-party → utwórz projekt, wpisz dane i Save changes → Preview invitation. Rejestracja LocalWP pozostaje wyłączona; można używać istniejącego konta WordPress.

Opcjonalny, idempotentny przykład dla istniejącego użytkownika (Open site shell, katalog public):

```sh
wp --user=<ID-istniejącego-użytkownika> eval-file wp-content/plugins/microsite-core/scripts/create-birthday-demo.php
```

Skrypt dodaje jeden prywatny szkic Demo · Birthday party, z przykładową osobą i datą wyliczaną w przyszłości. Nie zmienia istniejących projektów i przy ponownym uruchomieniu zwraca ten sam adres. Jest dostępny wyłącznie przez WP-CLI, nie przez WWW. Wymaga create_ms_sites i przypisuje właściciela z wybranego kontekstu użytkownika.

Kontrole (Open site shell, katalog app): npm run verify, npm run test:integration oraz anonimowe smoke/HMR testy zgodnie z README. Węższa kontrola podczas pracy nad rendererem: `TEST_SCOPE=birthday npm run test:integration`; pomija regresję poprzednich etapów i nie oznacza jej jako PASS. Oba tryby korzystają z tej samej stałej bazy testowej.

Screenshoty trafiają do app/test-results/birthday (ignorowane przez Git): 375×812, 768×1024, 1440×900, maksymalne treści i intro. Treści są fotografowane z reduced motion, co daje stabilny układ bez arbitralnych timeoutów. Szczegóły faktycznego wykonania i oględzin: STATUS.md.

Na tej stronie przykład należy do istniejącego administratora (ID 1), projekt ID 8: http://celebrations.local/app/sites/8/preview. Pozostałe projekty pozostawiono bez zmian. Jest to świadomie dodany prywatny przykład do obejrzenia, niezależny od fixture testów na stałej bazie.
