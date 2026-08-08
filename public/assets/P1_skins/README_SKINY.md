# Poop Clicker — pakiet skinów v1.0.0

87 skinów, każdy w tej samej przestrzeni rig 512×512 co postać bazowa, więc podmiana skina
nie wymaga repozycjonowania animacji ani kotwic.

## Zawartość

```
P4_skins/<id>/poop_<id>_normal.svg     wariant neutralny
P4_skins/<id>/poop_<id>_happy.svg      wariant domyślny (UI, sklep)
P4_skins/<id>/png/…_512.png            eksport 512 px, przezroczyste tło
P4_skins/<id>/png/…_256.png            eksport 256 px (listy, karty sklepu)
P4_skins/_thumbnails/<id>_192.png      miniatura do siatki wyboru skina
P4_skins/skins_atlas.png / .webp       atlas wszystkich 87 miniatur (10 kolumn, komórka 192)
P4_skins/skins_atlas.json              mapa klatek atlasu (x, y, w, h per id)
P4_skins/skins_manifest.json           metadane: id, nazwa, kategoria, rzadkość, ścieżki
```

## Struktura pliku skina

```xml
<g id="skin_dragon" data-anchor="256,402" data-skin="dragon" data-expression="happy">
  <g id="bg_0">…</g>              <!-- za postacią: aury, skrzydła, ogon, pierścienie -->
  <svg>…rig bez miny…</svg>        <!-- shadow, arm_left, arm_right, body, top_swirl, highlight -->
  <g id="skin_layer_0">…</g>      <!-- skin NA ciele: łuski, bandaże, paski, obwody, tekstury -->
  <g id="face" data-anchor="256,296">  <!-- MINA — zawsze nad skinem -->
    <g id="eyes">…</g><g id="mouth">…</g>
  </g>
  <g id="over_face_0">…</g>       <!-- świadomie zasłania minę: okulary, maski, kły, hełmy -->
</g>
```

Kolejność `bg → rig → skin_layer → face → over_face` jest zapieczona w pliku. Mina siedzi nad
warstwą skina, więc łuski dinozaura, bandaże mumii czy paski pszczoły nigdy jej nie przykryją.

Do `over_face` trafiają wyłącznie elementy, które mają zasłaniać minę z założenia:
maska ninja, opaska pirata, okulary (rockstar, punk, tourist, beach), monokl billionaire,
okulary scientist, hełm nurka i astronauty, kły vampire, oczy frog, twarz pumpkin, lupa detective.

## Kategorie i rzadkość

| Kategoria | Skiny | Domyślna rzadkość |
|---|---|---|
| food | classic, corny, nutty, spicy, burrito, taco, coffee | common |
| precious | rainbow, golden, diamond, emerald, ruby, obsidian | epic |
| cosmic | galaxy, blackhole, cosmic, moon, alien, astronaut | epic (blackhole: mythic) |
| tech | cyber, hacker, 404, rgb, robot, mecha | rare |
| elemental | radioactive, toxic, frozen, lava, storm, fire, cloud | rare |
| mythic | angel, demon, vampire, zombie, ghost, skeleton, mummy, witch | epic |
| characters | pirate → tourist (20 skinów) | rare |
| seasonal | santa, pumpkin, easter, valentine, oktoberfest | rare |
| nature | beach → tree (13 skinów) | rare |
| endgame | money, crypto, ceo, billionaire, royalflush, prestige, infinity, god, omni | legendary / mythic |

Rzadkości w `skins_manifest.json` to propozycja — nadpisz je własną ekonomią gry.

## Integracja

- Podmiana skina: załaduj `poop_<id>_happy.svg`, podmień węzeł `#poop_character` w scenie.
  Kotwice (`data-anchor`) pozostają identyczne we wszystkich 87 plikach.
- Podmiana samej miny: nadpisz grupę `#face` (albo `#eyes` / `#mouth` osobno) — reszta skina
  zostaje nietknięta, bo mina jest osobną, najwyższą warstwą nad `skin_layer_*`.
- Ekspresje: rig obsługuje 7 min (normal, happy, effort, panic, frenzy, overdrive, dizzy).
  W paczce są dwie wyeksportowane; pozostałe generujesz podmieniając grupy `#eyes` i `#mouth`
  z `P0_character/expressions/`.
- Warstwy `bg_*` z aurą (golden, prestige, god, omni, royalflush, infinity) mogą być
  animowane niezależnie — skalowanie 1.0 → 1.06 i obrót działają bez artefaktów.
- Skiny z przezroczystością (ghost, alpha 0.55) ustawiają `opacity` na zagnieżdżonym `<svg>`,
  nie na pojedynczych warstwach.
- `skins_atlas.png` + `skins_atlas.json` wystarczą do siatki wyboru skina bez ładowania 87
  osobnych plików.

## Uwagi

- `404` jako id katalogu jest poprawne, ale w routingu HTTP potrafi kolidować — jeśli
  serwujesz skiny po URL, użyj aliasu `glitch404`.
- Skiny endgame (god, omni, prestige, royalflush) mają duże aury wychodzące poza sylwetkę;
  zarezerwuj w UI kwadrat 512, nie kadruj do sylwetki.
- Kolory są parametryczne — paleta każdego skina siedzi w `_generator/poopkit/skins.py`
  w funkcji `registry()`. Zmiana jednego wpisu i ponowne uruchomienie generatora
  odtwarza cały zestaw.
