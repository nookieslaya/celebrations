# Dodawanie typu strony i szablonu

1. Dodaj wersjonowany kontrakt do `wp-content/plugins/microsite-core/contracts/<type-id>.v1.json`. Użyj title będącego nazwą typu TS. Każdy obiekt powinien mieć additionalProperties: false oraz jawną listę required. Określ limity, enumy i default dla każdego pola tekstowego. Obecny generator obsługuje object/string/enum/number/integer; nowy rodzaj wartości wymaga jego jawnego rozszerzenia i testów zgodności.
2. W `Catalog` dodaj zaufaną definicję do rejestru typów: id, name, schemaVersion, schema, defaults wyprowadzone z tego schematu oraz features. Nie dodawaj daty wydarzenia lub RSVP do modelu wspólnego.
3. Dodaj definicję szablonu do rejestru: id, version, siteTypes, rendererKey, allowedAppearance. Wartości wyglądu czerp z kontraktu, kiedy mają tę samą paletę. Klucz renderera jest metadanymi serwera; nie przyjmuj ścieżek lub funkcji od klienta. Renderer jest niezależnym modułem rejestrowanym przez templateId@templateVersion.
4. W Open site shell, w katalogu app: `npm run contracts:generate`, a potem `npm run verify`. Plik generated/drafts.ts jest commitowanym wynikiem generowania; nie edytuj go ręcznie. Rejestr obecnie wskazuje jedną aktywną wersję. Dodanie obsługi wielu wersji historycznych wymaga rozszerzenia mapowania generatora i jawnej strategii migracji.
5. Rozszerz testy integracyjne o defaults, poprawną konfigurację, nieznane pola i niezgodny szablon. Uruchom `npm run test:integration` na stałej, osobnej bazie testowej. Sprawdź katalog i istniejące CRUD; nowy typ nie wymaga nowych kontrolerów ani ścieżek API.

Zmiana aktywnego schemaVersion lub templateVersion blokuje edycję historycznego szkicu kodem 409. Nie przepisuj danych w tle i nie zmieniaj typu przez PATCH. Operacja migracji i published snapshot nie są jeszcze wdrożone.

## Moduł edytora React od etapu 3

Dodaj moduł w app/src/editors z komponentami Fields i Preview, typowanymi przez nowy typ z generated/drafts.ts. W Fields importuj kontrakt JSON danego typu dla limitów/enumów; nie utrzymuj niezależnego schematu. W Preview renderuj tekst przez JSX, bez dangerouslySetInnerHTML i dowolnego CSS od użytkownika. Dodaj wpis do jawnego registry.ts według siteType.

Wspólna powłoka EditorView obsługuje sesję, odczyt, nazwę projektu, blokadę zapisu, błędy, pełny PATCH i stan niezapisanych zmian; nie kopiuj tych mechanizmów do modułu typu. Lista i tworzenie korzystają z katalogu backendu. Gdy moduł dla zarejestrowanego typu jeszcze nie istnieje, panel pokazuje informację o niedostępnym edytorze zamiast próbować uruchamiać klasę/plik z payloadu.

Sprawdź rzeczywisty flow tworzenia/edycji oraz zachowanie danych po błędzie i odświeżeniu na izolowanej bazie. Lokalny Preview to element edytora, nie renderer publikacji. Etap 4 dostarcza BirthdayInvitationFields i osobny BirthdayParty. Szczegóły: BIRTHDAY-INVITATION.md.

Pełny preview włącza opcjonalna flaga fullPreview modułu edytora. Wspólna powłoka realizuje zapis przed nawigacją i ochronę dirty state; moduł nie kopiuje tej logiki. Renderer musi być lazy-loaded w renderers/registry.ts, przyjmować tylko konfigurację i nie importować kont/routera/API. Przypisz go do konkretnej wersji szablonu i sprawdź, że jego zależności nie trafiają do logowania/listy. Reguły specyficzne dla danych (np. DST) dodaj jako zaufany normalizer typu w Catalog; struktura i limity nadal pochodzą z JSON Schema.
