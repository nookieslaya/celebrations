# Publikacja — etap 5

## Szkic i publiczna wersja

`_microsite_data.draft` pozostaje konfiguracją roboczą. `_microsite_publication` jest jednym atomowo zastępowanym wpisem meta: `published`, `lastPublishedAt` i `snapshot`. Snapshot zawiera tylko `content`, `appearance`, `siteType`, `templateId`, `templateVersion`, `schemaVersion`. Zapis szkicu nie zapisuje publikacji. Nie ma historii snapshotów. Wycofanie zachowuje ostatni snapshot, szkic i publicId; odczyt publiczny natychmiast dostaje 404. Ponowna publikacja zachowuje URL. Identyczne ponowienie aktywnej publikacji zachowuje datę.

Operacje publikacji, wycofania i zmiany prawa są serializowane przez MySQL GET_LOCK, osobno dla bazy/prefiksu/projektu. Zajęta blokada daje 409, bez automatycznych retry. Zwolnienie następuje w finally, także po błędzie. Kompletny stan jest jednym zapisem meta; nie zapisujemy osobno treści, stanu i daty. Błąd zapisu daje 500. Zwykłe równoległe edycje szkicu nadal działają według ostatniego poprawnego zapisu; nie dodano historii ani rozwiązywania konfliktów edycji.

Porównanie konfiguracji i tożsamości wersji korzysta z SHA-256 kanonicznego JSON (rekurencyjnie sortowane klucze). Nazwa projektu i updatedAt nie wywołują fałszywego stanu zmian publikacji. Publiczny renderer otrzymuje wyłącznie snapshot. Walidacja odczytu nie normalizuje ponownie zamrożonego UTC.

## Prawo projektu i CLI

Centralnym serwisem jest `Microsite\Core\Publication`. `publish()` wymaga dostępu właściciela lub administratora, capability `publish_ms_sites` i odrębnego prawa projektu. Capability jest tylko możliwością użycia funkcji; nowy projekt domyślnie nie ma prawa publikacji. Nie istnieje status paid. `set_entitlement()` jest wspólnym punktem dla administracji i przyszłego modułu płatności, wymaga uprawnionej tożsamości serwerowej `manage_ms_sites`. Payload szkicu i komendy REST nie przyjmują prawa publikacji.

W LocalWP użyj **Open site shell**, przejdź do katalogu WordPressa:

```sh
wp microsite publication-right 8 grant --user=1
wp microsite publication-right 8 revoke --user=1
```

Zastąp 8 identyfikatorem projektu, a 1 identyfikatorem uprawnionego administratora. Polecenie działa również dla projektów innych właścicieli. Odebranie prawa nie wycofuje już opublikowanej strony. Blokuje przyszłe publikacje i aktualizacje; właściciel nadal zapisuje szkic i może wycofać stronę.

## Gotowość

JSON Schema pozostaje jedynym kontraktem struktury i limitów. `Catalog.publishRequired` wskazuje ścieżki wymagające treści do publikacji, a `SiteValidator::publishable` ponownie używa istniejącej walidacji/normalizera i sprawdza niepuste wartości (także Unicode whitespace). Dla birthday wymagane są solenizant, nagłówek, wiadomość, termin/strefa/UTC, nazwa miejsca i adres. Wiek, dress code, dodatkowa informacja są opcjonalne. Basic-page wymaga nagłówka. Niekompletne poprawne szkice nadal można zapisać. Braki gotowości dają 422 i `data.fields` ze ścieżkami pól. Nie ma wyłączania po terminie wydarzenia.

## REST i edytor

- `POST /wp-json/microsites/v1/sites/{id}/publish` — publikacja aktualnie zapisanego szkicu.
- `POST /wp-json/microsites/v1/sites/{id}/unpublish` — wycofanie.

Cookies sesji i X-WP-Nonce jak w istniejącym CRUD. Komendy nie przyjmują pól (puste body lub `{}`). Odpowiedź `{data: Site}` zawiera aktualne `publication`. Brak sesji 401, nonce 403, obcy/nieistniejący projekt 404, brak prawa 403, niegotowy szkic 422, zajęta blokada/niezgodna wersja 409. Nagłówki prywatnego API pozostają no-store/private.

Prywatny DTO `publication`: `published`, `publicUrl` (stały także przed pierwszą publikacją), `lastPublishedAt`, `hasUnpublishedChanges`, `canPublish`, `blockedReason`, `blockedCode`, `fieldErrors`. Brak prawa ma pierwszeństwo jako powód blokady, a wymagane pola mogą być pokazane równocześnie. Udostępnianie i QR pojawiają się dopiero po publikacji.

Edytor używa odpowiedzi backendu. Dirty form wymaga Save and publish albo Cancel. Publikacja nie rusza po nieudanym zapisie. Wycofanie wymaga potwierdzenia i nie usuwa niezapisanych pól formularza. Nie ma checkoutu.

## Publiczny dokument i link

`/s/{publicId}/` jest obsługiwane przez wtyczkę przed przekierowaniem kanonicznym WordPressa, niezależnie od motywu i bez zmiany istniejących permalinków. Prywatny CPT nadal jest wyłączony z publicznych zapytań i sitemap. Draft, wycofany i brak projektu dają 404.

PublicPage i templates/public.php nie uruchamiają powłoki kont/panelu, wp_head ani wp_footer. Nie emitują nonce, konfiguracji sesji i prywatnego API. Publiczna aplikacja ma oddzielny entry `src/public.tsx`; używa zawsze produkcyjnego manifestu, również gdy Vite dostarcza panel i HMR. Po zmianie kodu publicznego wykonaj `npm run build`. Bez właściwego builda dokument daje 503. Oba szablony wybiera ten sam zaufany rejestr rendererów. BirthdayParty i jego animacje pozostają wspólne z prywatnym preview.

Title, description, podstawowe OG i canonical pochodzą ze snapshotu i stałego URL serwera. Bez og:image. Dokumenty i błędy mają no-store oraz noindex/nofollow/noarchive. Odpowiedź serwera po wycofaniu/aktualizacji jest aktualna, ale komunikatory mogą zachować własne stare podglądy linków.

**Każdy posiadający link może go otworzyć i przekazać dalej. Losowy identyfikator i noindex nie są kontrolą dostępu.** Nie ma kodów dostępu, indywidualnych zaproszeń ani kont gości. LocalWP nie jest hostingiem publicznym: lokalny link i QR nie działają dla gości poza lokalnym środowiskiem. Panel pokazuje „Local preview — this link and QR are not publicly accessible.” Nie skonfigurowano tuneli ani hostingu.

## QR i assety

Lokalna, przypięta biblioteka [qrcode 1.5.4](https://github.com/soldair/node-qrcode) jest dynamicznie importowana dopiero po kliknięciu pobrania. SVG i PNG kodują dokładny backendowy publicUrl, z czarnymi modułami, białym tłem, quiet zone 4 i korekcją M. Bez logo i zewnętrznego API. Kopiowanie używa Clipboard API i fallbacku zaznaczenia; Share używa Web Share lub kopiowania. Nie generujemy QR na liście projektów.

Przyszłe SVG: `wp-content/plugins/microsite-core/app/src/assets/birthday-party/svg/`. Zasady w sąsiednim README.md. Obecne ręcznie dodane pliki pozostawiono bez zmian i nie importowano ich do renderera. Samo skopiowanie niczego nie aktywuje.

Następny etap: RSVP bez konta gościa, jako oddzielny moduł. Płatności, uploady, domeny własne i dostęp na kod pozostają poza tym etapem.


## Wedding W5 — publikacja administracyjna development

Wedding/modern-editorial nadal mają availability=development i są ukryte w katalogu. Wyłącznie te zaufane wpisy mają administrativePublication=true oraz zaimplementowany renderer. Nie odblokowuje to globalnie typów development. Bramka wymaga manage_options, publish_ms_sites, dostępu do projektu i istniejącego prawa publikacji projektu. Zwykły klient nie tworzy/publikuje wedding przez API. Anonimowy odczyt świadomie opublikowanego snapshotu nie wymaga administratora.

Read-only gotowość jest częścią istniejącego odczytu projektu. WeddingReadiness sprawdza wspólny termin, imiona, implementację opcji oraz treść aktywnych sekcji; reguły szczegółowe i stabilne ścieżki błędów opisuje docs/WEDDING.md. Szkic może pozostać niepełny. Snapshot zawiera również sections/entrance i zachowuje kanoniczne UTC. Publiczna projekcja pomija wyłączone treści i rozwiązuje tylko wskazane aktywne media właściciela; brakujący plik daje fallback bez ujawniania biblioteki. Metadata są dopasowane do typu przez SitePresentation.

Projekt Olivia & James (12) nie został automatycznie opublikowany ani odblokowany. Administrator po uzupełnieniu konfiguracji może jawnie nadać prawo w LocalWP Open site shell: `wp microsite publication-right 12 grant --user=radek`, następnie użyć Publish w edytorze. Aktualizacja, wycofanie, stały URL, link/QR, noindex i dotychczasowe zasady cache są wspólne. Bieżące wyniki runtime i ograniczenia znajdują się w docs/STATUS.md.
