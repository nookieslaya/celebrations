# Dodawanie typu strony i szablonu

1. Dodaj wersjonowany kontrakt do `wp-content/plugins/microsite-core/contracts/<type-id>.v1.json`. Użyj title będącego nazwą typu TS. Każdy obiekt powinien mieć additionalProperties: false oraz jawną listę required. Określ limity, enumy i default dla każdego pola tekstowego. Obecny generator obsługuje object/string/enum; nowy rodzaj wartości wymaga jego jawnego rozszerzenia i testów zgodności.
2. W `Catalog` dodaj zaufaną definicję do rejestru typów: id, name, schemaVersion, schema, defaults wyprowadzone z tego schematu oraz features. Nie dodawaj daty wydarzenia lub RSVP do modelu wspólnego.
3. Dodaj definicję szablonu do rejestru: id, version, siteTypes, rendererKey, allowedAppearance. Wartości wyglądu czerp z kontraktu, kiedy mają tę samą paletę. Klucz renderera jest metadanymi serwera; nie przyjmuj ścieżek lub funkcji od klienta. Rzeczywisty renderer będzie osobnym etapem.
4. W Open site shell, w katalogu app: `npm run contracts:generate`, a potem `npm run verify`. Plik generated/drafts.ts jest commitowanym wynikiem generowania; nie edytuj go ręcznie. Rejestr obecnie wskazuje jedną aktywną wersję. Dodanie obsługi wielu wersji historycznych wymaga rozszerzenia mapowania generatora i jawnej strategii migracji.
5. Rozszerz testy integracyjne o defaults, poprawną konfigurację, nieznane pola i niezgodny szablon. Uruchom `npm run test:integration` na osobnej nowej bazie. Sprawdź katalog i istniejące CRUD; nowy typ nie wymaga nowych kontrolerów ani ścieżek API.

Zmiana aktywnego schemaVersion lub templateVersion blokuje edycję historycznego szkicu kodem 409. Nie przepisuj danych w tle i nie zmieniaj typu przez PATCH. Operacja migracji i published snapshot nie są jeszcze wdrożone.
