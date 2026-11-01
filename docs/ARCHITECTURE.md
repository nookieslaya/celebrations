# Architektura i decyzje

WordPress LocalWP odpowiada za dokument panelu, routing i przyszłe REST API. Microsite Core rejestruje `/app/*` i renderuje własny dokument na template_redirect przed canonical redirect. Flush wykonywany przy aktywacji/dezaktywacji, nie przy każdym żądaniu. Panel wysyła no-store/private i noindex. Motyw nie uczestniczy w routingu panelu. W obecnym etapie nie dodajemy endpointów REST; bootstrap zawiera URL istniejącego REST WordPressa, bez sesji/nonce.

React korzysta z History API i ścieżki bazowej otrzymanej z home_url, bez założenia domeny/portu ani instalacji w root domeny. Nieznane trasy pokazują komunikat w panelu (dokument shell ma HTTP 200). Przyszły etap autoryzacji dopiero określi ochronę widoków i obsługę 404.

Development: Vite, dokładny origin CORS, React Refresh preamble według [oficjalnej integracji backendu](https://vite.dev/guide/backend-integration). Ignorowany marker tylko dla lokalnego WP, loopback i port walidowane w PHP. Po awarii Vite marker wymaga usunięcia; celowo nie ma ukrytego fallbacku maskującego błędy development. Produkcja: manifest i względna baza assetów, JS i CSS z katalogu wtyczki.

Dalsza architektura jest planem, nie zaimplementowanym API: prywatny CPT ms_site; kontrolery oddzielone od walidacji, autoryzacji, serwisów i persystencji. Site zawiera siteType, templateId, templateVersion, schemaVersion, content, appearance, features. Właściciel, stan i publiczny losowy identyfikator należą do danych systemowych. Szkic jest oddzielny od przyszłego opublikowanego snapshotu. Publiczny identyfikator nie daje uprawnień do szkicu.

Planowane jedno źródło kontraktów: wersjonowane JSON Schema, walidowane po stronie PHP i generujące typy TypeScript. Konkretny walidator i generator zostaną dobrane i sprawdzone w etapie modelu. Cookies WordPressa i REST nonce dla sesji, niezależna kontrola capabilities i właściciela. RSVP i płatności będą osobnymi modułami; ewentualne migracje wersjonowane i testowane na osobnej bazie, bez tworzenia ich teraz.
