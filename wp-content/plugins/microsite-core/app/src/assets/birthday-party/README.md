# Przyszłe assety birthday-party

Docelowe pliki: svg/gift-box.svg, svg/balloon-cluster.svg, svg/sparkle-cluster.svg oraz manifest.json. Samo skopiowanie plików nie aktywuje ich w rendererze. Obecne dekoracje i animacje pozostają bez zmian.

Przed integracją każdy plik wymaga ręcznego przeglądu i zamiany na zaufany komponent inline SVG. Animowane części oznaczamy data-part. Selektory GSAP ograniczamy do konkretnej instancji SVG (ref), bez globalnych zapytań po dokumencie. Kolory korzystają ze zmiennych CSS --asset-*.

Zabronione: script, event handlery (onload itd.), foreignObject oraz zewnętrzne zasoby, odnośniki i importy. Należy sprawdzić również style, identyfikatory i lokalne referencje, aby instancje nie kolidowały. Nie dodajemy automatycznego loadera dowolnych SVG ani dangerouslySetInnerHTML. Manifest i komponenty zostaną jawnie zatwierdzone w kolejnym etapie integracji assetów.
