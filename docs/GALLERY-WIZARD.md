# Galeria i kreator — 0.7.0

Galeria działa pod `/app/sites/new`. Wymaga sesji panelu. Zaproszenia urodzinowe mają pięć kroków: `about`, `event`, `responses`, `style`, `review`. Przykładowy adres istniejącego projektu: `/app/sites/10?step=about`. Basic page zachowuje prosty edytor, bez kroków wydarzenia.

## Katalog i miniatury

`Catalog` w PHP jest źródłem dostępności typów, zgodności szablonów, dozwolonych palet i pól wymaganych przed publikacją. Przy definicji szablonu znajdują się nazwa i opis. Publiczne metadane zawierają wyłącznie adresy HTTP miniatur, etykiety palet, domyślny szkic oraz przygotowane dane demo. Nigdy nie pobierają danych istniejących klientów ani ścieżek systemu plików. `initialDraft` wynika z istniejącego schematu i template defaults; `demoDraft` uzupełnia go fikcyjną uroczystością Alexa. Demo ma wyłączone RSVP.

Dziewięć PNG w `wp-content/plugins/microsite-core/assets/template-previews/` powstało z rzeczywistych rendererów i danych demo, po załadowaniu assetów, przy reduced motion. Nazwa pliku: `{templateId}-{palette}.png`. Galeria pokazuje jeden statyczny obraz na kartę; zmiana palety wybiera odpowiedni PNG. Renderery pozostają lazy i nie są uruchamiane na kartach.

Dodając metadane istniejącego szablonu, uzupełnij nazwę, opis, allowedAppearance i renderer registry. Etykiety palet są w Catalog. Zrób miniaturę dla każdej obsługiwanej palety tym samym rendererem i fikcyjnymi danymi. Nie dodawaj osobnej listy dostępności w React.

Regeneracja miniatur, w **LocalWP → Open site shell**, z katalogu wtyczki `app`:

```sh
npm run verify
UPDATE_TEMPLATE_THUMBNAILS=1 TEST_SCOPE=gallery npm run test:integration
```

Runner używa dotychczasowej stałej osobnej bazy testowej. Zwykłe testy nie nadpisują miniatur źródłowych; zapisują nowe klatki tylko w ignorowanych artefaktach. Po regeneracji obejrzyj PNG. Dla nowych szablonów należy również dodać ich mapowanie do zaufanego rejestru rendererów, nie kopiować rendererów do galerii.

## Demo i utworzenie

`/app/sites/new?type=birthday-invitation&demo=birthday-celebration&palette=disco-rose` uruchamia ten sam renderer co publiczna strona. Widoczny pasek Demo pozwala wrócić do wyboru; paleta pozostaje w URL. Demo nie wywołuje POST/PATCH, nie ma aktywnego formularza gościa, nie publikuje i nie wymaga uprawnienia publikacji. Pauza i reduced motion pochodzą z istniejących rendererów. Nieznany szablon demo daje czytelny powrót do galerii.

`Use this template` pokazuje formularz potwierdzenia nazwy. Dopiero `Create project` wysyła jeden istniejący POST z templateId oraz pełnym szkicem domyślnym z wybraną paletą. Synchroniczna blokada chroni przed podwójnym kliknięciem. POST nie jest ponawiany automatycznie. Błąd sieci, serwera lub nieprawidłowa odpowiedź powoduje komunikat o nieznanym wyniku, blokadę ponownego wysłania w tej próbie i link do sprawdzenia listy projektów. Backend nadal sprawdza zgodność typu, szablonu i palety.

## Definicja kroków

`editors/registry.ts` określa proste tablice `steps` oraz mapę `fields` z etykietą, krokiem i identyfikatorem pola. `feature: rsvp` wymaga rzeczywistej funkcji typu w katalogu. `projectName` wskazuje krok nazwy projektu, a `review` krok podsumowania. `Fields` otrzymuje identyfikator sekcji i palety z katalogu. Istniejący BirthdayInvitationEditor warunkowo pokazuje swoje dotychczasowe sekcje, bez drugich formularzy lub modelu zapisu. Opcjonalne ustawienia tekstów szablonu są zwijane.

`EditorView` obsługuje jeden stan projektu i szkicu, odczyt, błędy, zapis, progress, podgląd i publikację. Dodanie kolejnego typu wymaga modułu edytora oraz opcjonalnej prostej definicji jego kroków. Router nie zawiera kroków urodzinowych. Wybrany szablon pozostaje niezmienny.

## Zapis i nawigacja

- URL używa stabilnego `?step=event`, nie numeru. Nieznany lub niedostępny krok prowadzi do pierwszego dostępnego kroku.
- Powrót między krokami zachowuje stan formularza i ochronę niezapisanych zmian. Back/Forward między krokami tego samego edytora także nie wyrzucają danych. Opuszczenie projektu i beforeunload nadal chronią zmiany.
- Save & continue wysyła istniejący pełny PATCH i przechodzi dalej dopiero po sukcesie. Gdy nie ma zmian, przechodzi bez zbędnego zapisu. Błąd zachowuje dane i krok. Save draft zapisuje bez sprawdzania gotowości do publikacji.
- Nie ma autosave ani treści formularza w localStorage. sessionStorage przechowuje tylko ostatni identyfikator kroku, z przestrzenią nazw użytkownika i projektu. Wylogowanie lub wygaśnięcie sesji czyści te wpisy oraz dotychczasowy prywatny stan panelu.
- Focus przechodzi na nagłówek po zmianie kroku; link brakującego pola kieruje do właściwego kroku i pola. Zwykłe pisanie nie zmienia fokusu.

Nie poluzowano kontraktów szkicu: zaproszenie może nie mieć imienia, daty, miejsca lub treści. Wiek pozostaje opcjonalny. Wpisane błędne wartości (wiek, strefa, DST, deadline) nadal odrzuca istniejący backend. Nazwa projektu musi być niepusta, a basic-page zachowuje minimalną długość nagłówka ze swojego dotychczasowego kontraktu.

## Gotowość i publikacja

Istniejący chroniony GET projektu wywołuje `Publication::describe()` → `SiteValidator::publishable()`. Jest więc istniejącą operacją read-only sprawdzającą gotowość; nie dodano drugiego endpointu ani próbnej publikacji. `fieldErrors`, blokada prawa i stan publikacji wracają przy odczycie i zapisie. Podsumowanie zaznacza, że wynik dotyczy zapisanego szkicu, a przy dirty pokazuje jego nieaktualność względem formularza.

Licznik postępu mierzy wypełnienie ścieżek `publishRequired` z katalogu; nie jest niezależnym walidatorem publikacji ani oznaczeniem odwiedzonych kroków jako gotowych. Decyzja o publikacji nadal należy do backendu. Braki mają etykiety i odsyłacze zamiast technicznych ścieżek.

W Review używany jest dotychczasowy PublicationPanel: Publish / Update live page, Unpublish, View live page, kopiowanie/udostępnianie i QR. Zapis szkicu nie modyfikuje publicznej wersji. Brak prawa nie blokuje edycji, zapisu ani prywatnego podglądu; nie nadajemy go automatycznie i nie pokazujemy zakupu.

## Testy i ograniczenia

`TEST_SCOPE=gallery npm run test:integration` wykonuje pięć grup na prawdziwym WordPressie, produkcyjnym buildzie bez Vite i tej samej izolowanej bazie. Obejmuje nowe konto → galerię → demo → paletę → pojedyncze utworzenie → zapis kroków → podgląd → administracyjne nadanie prawa → publikację → anonimowy odczyt → prawdziwe RSVP → panel odpowiedzi. Dodatkowo: brak zapisu przez demo, opóźniony/błędny PATCH, utracona odpowiedź POST, częściowy szkic, dirty leave, refresh, niewłaściwy/niedostępny krok, read-only gotowość, izolacja właściciela, niezależny szkic i basic-page.

Screenshoty galerii, formularza, review i błędu w 390×844 oraz 1440×900 są w `app/test-results/gallery/`. Nie commituj ich ani dist. Źródłowe miniatury w assets są częścią wtyczki i powinny być wersjonowane. Dotychczasowe scenariusze mają wspólny helper `tests/editor-navigation.mjs` dostosowujący nawigację do galerii i kroków; zakres faktycznie uruchomionych kontroli jest w STATUS.md.

Nie ma nowych szablonów, efektów, płatności, hostingu, zmiany szablonu istniejącego projektu ani publicznej strony marketingowej. Demo jest dostępne w panelu. Rejestracja LocalWP pozostaje bez zmian. Reset hasła, weryfikacja emaila, PHPCS/CI i ograniczenia dotychczasowych kont/publicznego uruchomienia pozostają poza tym etapem.
