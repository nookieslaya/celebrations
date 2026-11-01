# Plan wykonania

Inspekcja LocalWP i dostępnych narzędzi; rejestracja ścieżek we wtyczce; dokument niezależny od motywu; React z prostą nawigacją; dev marker i Refresh; build z manifestem; kontrola składni/statyczna; testy przeglądarkowe obu tras, odświeżania i HMR; zapis wyników. Lista zadań jest wyłącznie w tasks.md.

Spec Kit: brak poleceń uv i specify w tym środowisku oraz brak istniejącej konfiguracji. Oficjalna instrukcja wymaga uv/Python 3.11+; [integracja Codex](https://github.github.io/spec-kit/integrations/codex.html) używa `specify init my-project --integration codex` i instaluje .agents/skills. Zgodnie z dopuszczonym fallbackiem używamy plików Markdown, bez instalowania globalnych narzędzi ani inicjalizacji nad istniejącym WP. Źródła sprawdzono 2026-11-01.

## Etap 2

Dodać backend szkiców w istniejącej wtyczce: prywatny CPT i uprawnienia, jawny rejestr, JSON Schema z generowaniem TS, walidację i warstwy repozytorium/serwisu/autoryzacji/REST. Dodać klient API przyjmujący nonce od przyszłego modułu sesji. Przygotować izolowaną bazę i tymczasowy WordPress korzystający z istniejących plików core; sprawdzić uprawnienia i nonce przez HTTP. Zachować działający Vite i panel. Nie wdrażać logowania, edytora ani publikacji.

## Etap 3

Zachować istniejący backend CRUD i Vite. Dodać bootstrap sesji w dokumencie WP, chroniony odczyt sesji oraz endpointy kont z ochroną anonimowego kontekstu CSRF/origin i limitowaniem. Rozwinąć klient API, router History API, formularze kont, listę i tworzenie z katalogu oraz rejestr modułów edytora. Zapewnić ochronę niezapisanych zmian i nieaktualnych odpowiedzi. Rozszerzyć istniejący izolowany runner o rzeczywiste testy HTTP i Playwright produkcyjnego buildu. Nie zmieniać rejestracji na stronie LocalWP (zastana wartość 0).

## Aktualizacja strategii bazy testowej

Na polecenie użytkownika po etapie 3 używamy jednej stałej, dedykowanej bazy projektu zamiast losowej bazy na każdy przebieg. Czyścimy tylko jej tabele ms_test_* po sprawdzeniu markerów, izolacji od DB_NAME strony i wyłącznej blokady. Po testach baza pozostaje do ponownego użycia.

## Etap 4

Rozszerzyć istniejący kontrakt i rejestry o birthday-invitation/birthday-party, bez nowych CRUD. Dodać temporalną normalizację lokalnej daty + IANA do UTC z wykrywaniem gap/fold DST, moduł edytora i prywatny /app/sites/{id}/preview. Renderer ma otrzymywać tylko zwalidowane dane i ładować GSAP dopiero dla właściwego szablonu. Naturalny scroll, świadome intro, reduced motion, fail-open i cleanup. Zweryfikować HTTP/E2E oraz screenshoty na trzech szerokościach na stałej bazie testowej. Nie zmieniać users_can_register ani konfiguracji PHPCS/CI.
