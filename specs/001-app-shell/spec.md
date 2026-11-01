# Specyfikacja: panel LocalWP

Dostarczyć działający shell /app/ i /app/sites niezależnie od motywu. Bezpośrednie wejście i odświeżenie obu adresów muszą działać. Development: dokument pod originem WP, assety/HMR z Vite. Produkcja: manifest Vite, brak zależności od uruchomionego Vite. Nie naruszać istniejących treści ani aktywnego motywu. Zakres wyklucza konta, projekty, zaproszenia i płatności.

## Etap 2: backend ministron

Dostarczyć prywatny model szkicu Site jako CPT ms_site, jawny rejestr basic-page/basic i chronione API catalog/sites w namespace microsites/v1. Właściciel wynika z sesji WordPressa; capabilities i własność są sprawdzane niezależnie od REST nonce. Cudzy i nieistniejący zasób mają ten sam 404. Konfiguracja korzysta z jednego kontraktu JSON Schema z defaults, limitami, zakazem nieznanych pól i generowaniem TS. PATCH zastępuje cały draft, bez merge. Typ/wersje, publicId i pozostałe dane systemowe nie są edytowalne przez payload. Lista ma paginację i limit 50. Testy cookies/nonce i izolacji muszą korzystać z prawdziwego HTTP i osobnej nowej bazy, z odmową użycia DB_NAME strony. Zachować działający panel i istniejący Vite. Customowe konta, edytor, renderer/publikacja i pozostałe moduły produktu nie należą do etapu 2.

## Etap 3: konta i panel

Umożliwić rejestrację klienta zgodną z konfiguracją WP, login email/hasło, bootstrap sesji/nonce, wylogowanie, listę i tworzenie z katalogu oraz edycję basic-page. Wykorzystać natywne cookies bez JWT/storage. Chronić login/rejestrację kontekstem przeglądarki, originem i ograniczeniem prób. Zachować prywatność stanu między użytkownikami, stany błędów i bezpieczny powrót po loginie. Edytor ma jawny pełny zapis, blokadę równoległych żądań, zachowanie danych po błędzie, warning niezapisanych zmian i lokalny podgląd. Testować konta przez HTTP i cały flow w Chromium na oddzielnej bazie oraz buildzie produkcyjnym bez zatrzymywania Vite. Nie wdrażać kolejnych etapów.

## Etap 4

Dostarczyć birthday-invitation/schemaVersion 1 i birthday-party/templateVersion "1" przez istniejące CRUD i rejestry. Zachować basic-page. Umożliwić niekompletny szkic, pełne teksty i trzy palety. Zapisywać lokalną datę/strefę IANA i backendowy UTC; odrzucać gap/fold DST. Podgląd prywatny /app/sites/{id}/preview ma wymagać istniejącej własności/capabilities, być no-store/noindex i używać zapisanego szkicu. Renderer przyjmuje tylko dane, lazy-loaduje GSAP i obsługuje intro, reveal, treść, szczegóły, closing, klawiaturę, reduced motion, cleanup i brak animacji bez ukrytej treści. Testować izolowany HTTP/E2E i oglądać screenshoty trzech rozmiarów oraz długich tekstów. Nie wdrażać publikacji ani kolejnych modułów produktu.
