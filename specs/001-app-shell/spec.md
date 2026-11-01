# Specyfikacja: panel LocalWP

Dostarczyć działający shell /app/ i /app/sites niezależnie od motywu. Bezpośrednie wejście i odświeżenie obu adresów muszą działać. Development: dokument pod originem WP, assety/HMR z Vite. Produkcja: manifest Vite, brak zależności od uruchomionego Vite. Nie naruszać istniejących treści ani aktywnego motywu. Zakres wyklucza konta, projekty, zaproszenia i płatności.

## Etap 2: backend ministron

Dostarczyć prywatny model szkicu Site jako CPT ms_site, jawny rejestr basic-page/basic i chronione API catalog/sites w namespace microsites/v1. Właściciel wynika z sesji WordPressa; capabilities i własność są sprawdzane niezależnie od REST nonce. Cudzy i nieistniejący zasób mają ten sam 404. Konfiguracja korzysta z jednego kontraktu JSON Schema z defaults, limitami, zakazem nieznanych pól i generowaniem TS. PATCH zastępuje cały draft, bez merge. Typ/wersje, publicId i pozostałe dane systemowe nie są edytowalne przez payload. Lista ma paginację i limit 50. Testy cookies/nonce i izolacji muszą korzystać z prawdziwego HTTP i osobnej nowej bazy, z odmową użycia DB_NAME strony. Zachować działający panel i istniejący Vite. Customowe konta, edytor, renderer/publikacja i pozostałe moduły produktu nie należą do etapu 2.
