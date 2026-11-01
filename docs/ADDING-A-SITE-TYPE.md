# Dodawanie typu strony — plan kontraktu

Rejestr nie został jeszcze zaimplementowany. W kolejnym etapie definicja typu będzie dostarczać ID, nazwę, schemaVersion, schemat JSON, domyślne dane, funkcje i zgodne szablony. Definicja szablonu dostarczy ID, wersję renderera, zgodne typy, assety oraz ograniczenia wyglądu. Backend waliduje konfigurację według wspólnego kontraktu; typy TS są generowane, nie utrzymywane osobno.

Pierwszym sprawdzianem będzie basic-page (tytuł, krótki opis, akcent z palety). Rejestracja nowego typu nie może tworzyć osobnej ścieżki kont, zapisu czy autoryzacji. Treści klienta pozostają danymi; nie wolno przyjmować dowolnego kodu ani ścieżek rendererów. Dokładne komendy i pliki zostaną opisane po implementacji rejestru.
