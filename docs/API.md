# REST API — etapy 2–3

Bazą jest `<WordPress rest_url>/microsites/v1/`, zwykle `/wp-json/microsites/v1/`. Nie hardkoduj domeny. Dane wejściowe zapisów muszą być obiektem JSON z Content-Type: application/json. Przykłady poniżej zakładają istniejącą sesję WordPress oraz prawidłowy X-WP-Nonce dla akcji wp_rest.

## Format

Sukces: `{ "data": ... }`. Błąd jest standardowym błędem WordPress REST: `{ "code": "microsite_validation_error", "message": "...", "data": { "status": 400 } }`. Core może zwrócić własny kod, np. rest_cookie_invalid_nonce, rest_invalid_param lub rest_invalid_json. Nie zawijamy błędów WordPressa w drugi format. Wszystkie odpowiedzi namespace mają Cache-Control: no-store, private, max-age=0 i Vary: Cookie, X-WP-Nonce.

## GET /catalog — publiczny

Zwraca `data.siteTypes` (id, name, schemaVersion, features) i `data.templates` (id, version, siteTypes, allowedAppearance). Obecnie basic-page i basic 1.0.0. Katalog nie ujawnia schematu wewnętrznego, rendererKey, klas ani ścieżek. Metadane nie dają dostępu do żadnego szkicu.

## POST /sites — sesja i create_ms_sites

```json
{
  "name": "Landing page for my event",
  "siteType": "basic-page",
  "templateId": "basic"
}
```

Zwraca HTTP 201 i pełny DTO projektu w data. Właściciel pochodzi wyłącznie z sesji. Wersje i losowy publicId wybiera backend. Pominięcie draft daje:

```json
{
  "content": {
    "heading": "A new beginning",
    "description": ""
  },
  "appearance": {
    "accent": "sage"
  }
}
```

Można przesłać kompletny draft zamiast defaults. Jawne null, częściowa konfiguracja i nieznane pola są błędem 400. Limity: name 1–120 znaków i nie może być białymi znakami; heading 1–160; description do 2000; accent: sage/rose/ocean. Name jest nazwą projektu i nie zmienia nagłówka ministrony.

## GET /sites?page=1&per_page=20 — sesja i edit_ms_sites

Zwraca `data.items` z własnymi projektami oraz `data.pagination` z page, perPage, total, totalPages. Maksymalny per_page: 50, minimalny 1. Page jest liczbą całkowitą 1–100000. Błędne wartości zwracają 400, nie są po cichu przycinane. Porządek: data utworzenia malejąco, ID malejąco jako tie-breaker. Strona poza zbiorem zwraca pustą listę. Administrator też otrzymuje wyłącznie własną listę.

## GET /sites/{id} — sesja, edit_ms_sites i właściciel

Administrator może odczytać cudzy szkic z manage_ms_sites i edit_others_ms_sites. Pozostali nie odróżnią cudzego, niedostępnego i nieistniejącego ID: zawsze 404 microsite_not_found / Project not found.

Przykładowy DTO (daty UTC):

```json
{
  "data": {
    "id": 42,
    "publicId": "8b55c78abe2eaa54ccaf19e47e768c55",
    "name": "Landing page for my event",
    "siteType": "basic-page",
    "templateId": "basic",
    "templateVersion": "1.0.0",
    "schemaVersion": 1,
    "draft": {
      "content": { "heading": "A new beginning", "description": "" },
      "appearance": { "accent": "sage" }
    },
    "status": "draft",
    "createdAt": "2026-11-01T16:00:00Z",
    "updatedAt": "2026-11-01T16:00:00Z"
  }
}
```

## PATCH /sites/{id} — takie same uprawnienia jak odczyt

```json
{
  "name": "A renamed project",
  "draft": {
    "content": {
      "heading": "Welcome to our page",
      "description": "A short plain text description."
    },
    "appearance": {
      "accent": "rose"
    }
  }
}
```

Name i draft są opcjonalne, ale wymagane jest co najmniej jedno z nich. Jeśli draft jest przesłany, zastępuje całą konfigurację po pełnej walidacji. Nie ma merge. Walidacja odbywa się przed zapisem nazwy i konfiguracji. Nie można zmieniać siteType, templateId, schemaVersion, templateVersion, publicId, właściciela, stanu, dat, capabilities ani danych publikacji/płatności. Każde takie pole jest błędem 400. Wersja zapisanego szkicu niezgodna z aktualnym rejestrem daje 409 microsite_version_conflict; migracja nie jest automatyczna.

## Sesja i klient React

Moduł `app/src/api/client.ts` udostępnia createApiClient({ restUrl, getNonce }), ApiError i metody catalog/list/read/create/update. Publiczny katalog nie potrzebuje nonce. Chronione operacje bez nonce są blokowane przez klienta jeszcze przed fetch. Cookies są wysyłane z credentials same-origin; operacje nie są automatycznie ponawiane.

Bootstrap sesji jest generowany przy serwowaniu dokumentu /app/*. Client przyjmuje dynamiczne getNonce/getAuthCsrfToken, onNonce i onSessionExpired. Odczyty mogą być anulowane; zapisy nie mają automatycznych retry. Błąd sieci ma ApiError code=network_error i status=0. Zwykłe 403 jest odróżniane od 401/rest_cookie_invalid_nonce.

## GET /session — sesja cookies i REST nonce

Zwraca aktualny stan:

```json
{
  "data": {
    "user": {
      "id": 12,
      "email": "customer@example.com",
      "displayName": "customer",
      "canCreateSites": true,
      "canEditSites": true
    },
    "nonce": "nonce-for-current-session",
    "registrationEnabled": false
  }
}
```

Bez prawidłowej sesji/nonce jest 401 lub core'owy 403 dla błędnego nonce, nie pozornie poprawna anonimowa sesja. Początkowe user/nonce pochodzą z prywatnego dokumentu, więc działa rozpoznawanie po odświeżeniu. Nagłówek X-WP-Nonce kolejnych odpowiedzi odświeża wartość w pamięci klienta.

## POST /auth/login — publiczny z kontekstem CSRF

```json
{ "email": "customer@example.com", "password": "a long private passphrase" }
```

Wymaga Origin równemu originowi strony, Content-Type: application/json, podpisanego HttpOnly cookie kontekstu oraz nagłówka X-Microsite-CSRF z bootstrapu dokumentu. Cookie i nagłówek są związane ze sobą; nie jest to wspólne anonimowe WP nonce. Brak/błędny kontekst i obcy Origin dają 403 microsite_csrf_rejected. Kontekst wygasa po 30 minutach; odświeżenie dokumentu tworzy nowy.

Zwraca 200, natywne cookies WordPress i taki sam Session DTO jak GET /session. Nonce w odpowiedzi jest związany z nowym tokenem sesji. Błędny email/hasło dla poprawnej struktury żądania daje generyczne 401 microsite_invalid_credentials. Nieznane pola i błędna struktura to 400 microsite_auth_validation. Maksymalna długość emaila: 254 bajty; hasła logowania: 1–128 bajtów. Nie ma pól remember ani przekierowania pochodzącego z payloadu.

## POST /auth/register — taka sama ochrona CSRF

```json
{
  "email": "customer@example.com",
  "password": "a long private passphrase",
  "passwordConfirmation": "a long private passphrase"
}
```

Respektuje users_can_register; wyłączenie daje 403 microsite_registration_disabled. Nie włącza rejestracji automatycznie. Hasło nowego konta musi mieć 12–128 bajtów i identyczne potwierdzenie. WordPress dodatkowo stosuje swoje ograniczenia danych konta. Rola microsite_customer jest zawsze ustawiana przez serwer; role/capabilities i wszystkie dodatkowe pola są odrzucane. Duplikat lub błąd natywnej rejestracji ma generyczne 400 microsite_registration_failed.

Sukces: 201 i Session DTO; użytkownik jest od razu zalogowany natywną sesją, bez potrzeby osobnego loginu. Nie ma jeszcze weryfikacji emaila ani resetu hasła.

## POST /auth/logout — sesja cookies i REST nonce

Nie wymaga payloadu. Wywołuje natywne wp_logout, niszczy bieżący token i czyści cookies. Zwraca 200 z user:null, nonce:null i bieżącym registrationEnabled. Stary nonce/cookie nie daje już dostępu. Klient usuwa prywatne dane i powiadamia inne karty bez przesyłania sekretów.

## Limity kont

Login: 10 prób na IP/15 minut; rejestracja: 5 prób na IP/15 minut. Dotyczy również poprawnych prób po zweryfikowaniu CSRF. 429 microsite_rate_limited zawiera data.retryAfter i nagłówek Retry-After z sekundami do końca okna. IP pochodzi z REMOTE_ADDR, nie z niezaufanego X-Forwarded-For. Nie są logowane hasła ani cookies. Testy zerują liczniki tylko w izolowanej bazie, nigdy na stronie LocalWP.
