# Media aplikacji — W2

Wspólny moduł microsite-core przechowuje zdjęcia jako attachmenty WordPress Media Library. Panel używa customowego selektora; nie otwiera administracyjnego media modal i nie nadaje klientom upload_files, edit_posts lub praw administratora. Implementacja jest ukończona w kodzie, ale nie została sprawdzona w runtime w W2.

## Autoryzacja i właściciel

Każdy endpoint wymaga zalogowania, jawnego nagłówka X-WP-Nonce z aktualnym REST nonce, edit_ms_sites i dostępu do wskazanego projektu według dotychczasowych Permissions. Samo ID projektu/attachmentu nie daje dostępu. Prawa projektu administratora nadal wymagają istniejących manage_ms_sites i edit_others_ms_sites.

Zasób musi być attachmentem JPEG/PNG/WebP o statusie inherit, mieć post_author równy właścicielowi projektu oraz prywatny marker `_microsite_asset_owner` z tym samym ID. Marker nadaje serwer, nie payload projektu. Historyczne pliki WP i zasoby innych użytkowników są wykluczone, nawet jeśli istnieją i administrator zna ID.

Administrator pracujący nad cudzym projektem ogląda bibliotekę właściciela tego projektu, a nie swoją całą bibliotekę. Wgrany w tym kontekście plik również należy do właściciela projektu. Jeden użytkownik może używać swoich zasobów w kilku własnych projektach; nie wprowadzamy automatycznego współdzielenia między właścicielami ani przepisywania zasobów przy zmianie autora projektu poza aplikacją.

Sprawdzenie referencji odbywa się w SiteService przy create/update pełnego draft, przed prywatnym preview i w Publication przed utworzeniem snapshotu. Obecny adapter referencji obejmuje hero.photo, story.photo i gallery.photos wedding, także sekcje wyłączone. Inne typy nie mają w kontrakcie zdjęć. Przy dodaniu pola zdjęciowego do innego typu trzeba rozszerzyć ten jawny adapter; nie skanuj dowolnych obiektów po nazwie attachmentId. Wedding nadal ma bezwarunkową blokadę publikacji development.

Listę standardowego REST `/wp/v2/media` filtrujemy tak, aby nie ujawniała zasobów modułu, a pojedyncze trasy REST takich attachmentów zwracają 404. Dotyczy również administratora: aplikacyjny DTO otrzymuje on przez trasę projektu. Standardowa historyczna biblioteka pozostaje poza tym filtrem. Administracja plikami w wp-admin pozostaje domeną uprawnionych administratorów WordPressa, nie klientów panelu.

## API

Namespace `/wp-json/microsites/v1`:

| Metoda | Trasa | Wynik |
| --- | --- | --- |
| GET | sites/{id}/media?page=1 | Biblioteka właściciela, po 12 plików, pagination i limits. |
| POST | sites/{id}/media | multipart/form-data, pole file; 201 i potwierdzony DTO zasobu. |
| GET | sites/{id}/media/{asset} | Jeden dostępny zasób, 404 dla cudzego/brakującego/historycznego. |

Odpowiedzi korzystają z dotychczasowego formatu `{data: ...}` i filtrów no-store/private/Vary. DTO zasobu zawiera wyłącznie id, name i sizes (thumbnail/medium/large/full jeśli dostępne: url, width, height). Nie ma ścieżek lokalnych, post_meta, właściciela, EXIF czy sekretów. Adresy i rozmiary rozwiązuje WordPress; klient nie podaje URL lub ścieżki pliku do rozwiązania. Publiczny renderer nie może używać endpointu listującego bibliotekę.

Nie ma endpointu trwałego usuwania, kadrowania ani administracyjnego przepisywania zasobów. Zgłoszenia błędów są ogólne, bez ścieżek uploadu lub zawartości plików. Moduł nie loguje plików/sekretów. Konfiguracja zewnętrznego proxy/APM nie powinna logować multipart body ani cookies/nonce.

## Format i limity

MediaService::limits jest wspólnym źródłem limitów backendu i odpowiedzi API. Filtry microsite_media_max_bytes, microsite_media_max_pixels i microsite_media_max_files pozwalają obniżyć limity do wymagań instalacji, w granicach poniższych maksymalnych wartości:

- 10 MB na plik, dodatkowo ograniczone przez wp_max_upload_size (limity PHP/hostingu i ewentualne ograniczenia WordPressa).
- 25 000 000 pikseli na obraz.
- 50 plików modułu na właściciela, nie całej historycznej biblioteki WP. Zliczane są attachmenty z markerem i autorem właściciela, we wszystkich statusach, w tym koszu. Brak publicznej operacji usuwania oznacza, że osiągnięcie limitu wymaga świadomej administracji poza modułem.
- JPEG, PNG i WebP. SVG, GIF, HEIC i pozostałe pliki są odrzucane. Host musi obsługiwać dany format przez edytor WordPressa.

Serwer sprawdza błąd PHP uploadu, rzeczywistą długość pliku tymczasowego i is_uploaded_file. Odczytuje nagłówek/wymiary przed dekodowaniem dużego obrazu, porównuje rzeczywisty MIME obrazu z dozwolonym rozszerzeniem i wp_check_filetype_and_ext, a po sprawdzeniu megapikseli używa dekodera wp_get_image_editor, aby odrzucić uszkodzone obrazy. Nie ufa deklarowanemu Content-Type ani samej nazwie. Przenoszenie pliku i warianty obsługuje media_handle_upload/wp_generate_attachment_metadata, bez własnego procesora.

Limit biblioteki jest sprawdzany pod blokadą GET_LOCK zależną od bazy, prefiksu i właściciela, utrzymywaną przez zapis attachmentu i generowanie wariantów; równoległy upload dla tej biblioteki dostaje 409. Hosting musi obsługiwać istniejący mechanizm advisory locks. Przekroczenie rozmiaru daje 413, formatu/wymiarów/uszkodzenia 400, limitu/busy 409. Żądanie odrzucone wcześniej przez serwer WWW lub post_max_size może dać błąd hostingu zamiast JSON; panel pokazuje błąd i zachowuje szkic.

## Dostępność plików

**Nie zapewniamy prywatności binarnych plików.** Standardowe uploads WordPressa i miniatury mogą być dostępne przez bezpośredni URL również przed publikacją projektu. Ochrona endpointów i przypisania nie zamienia publicznego uploadu w prywatny storage. Selektor pokazuje tę informację przed wyborem/wgraniem. Nie dodano podpisanych URL, prywatnego storage ani obietnic usuwania metadanych zdjęcia. Wgrywać należy tylko materiały odpowiednie do udostępnienia.

## Upload a zapis szkicu

Upload jest oddzielną operacją. Sukces natychmiast tworzy plik w bibliotece, po czym wybór potwierdzonego ID zmienia lokalny draft. Nadal potrzebny jest jawny Save draft. Błąd PATCH nie usuwa zdjęcia ani formularza; zasób pozostaje do ponownego wyboru.

MediaPicker nie wkłada do draft tymczasowej ścieżki, File ani niepotwierdzonego ID. Galeria dodaje pozycję dopiero po potwierdzeniu uploadu lub wyborze istniejącego assetu. W czasie uploadu widoczny jest stan wysyłania, ponowne wysłanie jest blokowane refem, a wspólny EditorOperationsProvider blokuje zapis i edycję formularza do zakończenia operacji oraz uruchamia ochronę wyjścia. Bez potwierdzonego wyniku nie zapisujemy nowego zdjęcia.

Przerwanie sieci/opuszczenie strony nie oznacza anulowania operacji na serwerze. Nie ponawiamy uploadu automatycznie. Przy niepewnym wyniku warto ponownie otworzyć bibliotekę przed kolejnym wysłaniem — plik mógł już powstać i liczyć się do limitu. Nie dodano serwerowej idempotencji uploadów ani automatycznego sprzątania nieużywanych plików.

Remove photo reference / Remove item usuwa wyłącznie użycie w lokalnym szkicu. Nie usuwa pliku. Alt jest zapisany w konkretnym użyciu hero/story/gallery, niezależnie od alt w innym miejscu i globalnych metadanych WP.

## Weryfikacja W2

Wyłącznie php -l i TypeScript oraz zgodność wygenerowanych kontraktów. Schemat W1 nie zmienił się. Nie uruchamiano uploadu, odczytu HTTP, próby cudzego ID, równoległych żądań, przeglądarki ani testów integracyjnych. Opisane mechanizmy wymagają osobnej weryfikacji runtime i bezpieczeństwa przed produkcyjnym udostępnieniem.

## Zbiorczy prywatny podgląd — W3

GET sites/{id}/preview dla wedding sprawdza dodatkowo manage_options i przygotowuje previewMedia przez MediaService::preview_assets. To ta sama kontrolowana operacja podglądu projektu, bez endpointu przyjmującego listę dowolnych ID. Rozwiązuje tylko referencje włączonych hero/story/gallery (do 42 unikalnych zasobów), po sprawdzeniu autora, markera, statusu/MIME i fizycznego pliku w standardowym lokalnym uploads. Nie zwraca całej biblioteki. Przy braku dostępu/usuniętym pliku pomija DTO bez URL, umożliwiając fallback w rendererze; nie usuwa referencji ze szkicu. Walidacja create/update nadal odrzuca niedozwolone referencje. Zachowanie pozostałych typów API pozostaje bez pola previewMedia.

Rodzic iframe przekazuje tę ograniczoną reprezentację do renderera. Nowy renderer nie wykonuje fetch biblioteki ani requestu dla każdego zdjęcia, nie zna nonce i sesji. Photo wybiera large/medium/full, srcset/sizes i jawne wymiary; hero jest eager, pozostałe obrazy lazy. Błąd img ukrywa zdjęcie lub przełącza hero na typografię. Podgląd używa bieżącej autoryzacji przy każdym odczycie, nie zapisuje URL w draft i nie zmienia snapshotu.

CSP iframe nadal dopuszcza lokalne media tego samego originu. Obsługa offload/CDN, prywatnego storage i podpisanych URL nie została dodana. Kontrola istnienia get_attached_file zakłada standardowy lokalny magazyn WordPressa. Dostępność binarnych uploads przez URL pozostaje jak opisana wyżej. Nie przeprowadzono prób HTTP/mediów w W3; wykonano wyłącznie uzgodnione kontrole statyczne.
