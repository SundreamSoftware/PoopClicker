# Raport ekonomii

Jak liczone są PP, GTP i Flush Power: formuły produkcji, koszty, źródła i ujścia walut, prestiż oraz płatności. Katalog generatorów i upgrade’ów jest w [SHOP_FLUSH_HUD_REPORT.md](./SHOP_FLUSH_HUD_REPORT.md).

Źródło: `formulas.ts`, `production.ts`, `flush.ts`, `eventSystem.ts`, `daily.ts`, `dailyDump.ts`, `autoBuy.ts`, `iapProducts.ts`, `chests.ts`, `royalFlush.ts`.

## Trzy waluty

| Waluta          | Rola                                                                                | Czy się resetuje przy Flushu? |
| --------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| **PP**          | Miękka waluta runu. Tap, idle, nagrody. Kupuje generatory i upgrade’y runu          | Saldo runu tak. Lifetime nie  |
| **GTP**         | Meta. Eventy, daily, osiągnięcia, IAP, skrzynie                                     | Nie                           |
| **Flush Power** | Prestiż. Mnoży tap i idle. Próg do węzłów Royal Flush — **nigdy nie jest wydawany** | Nie                           |

PP ma trzy liczniki:

| Pole               | Zachowanie                                                               |
| ------------------ | ------------------------------------------------------------------------ |
| `currentPP`        | Saldo. Maleje przy zakupach                                              |
| `runPPEarned`      | Suma zarobku w runie. **Nie maleje** przy zakupach. Podstawa Flush Power |
| `lifetimePPEarned` | Suma życia. Unlock wczesnych generatorów                                 |

Jednym zdaniem: tap i generatory robią PP → PP kupuje siłę runu → Flush zamienia run w Flush Power → GTP kupuje wygodę, skrzynie, skiny i drzewko Royal Flush.

## Formuły produkcji

Stałe z `ECONOMY`:

| Stała                   |                             Wartość |
| ----------------------- | ----------------------------------: |
| Bazowy tap              |                                1 PP |
| Wymóg Flush             |                       25 000 run PP |
| Bazowy crit             |                              2% × 5 |
| Max crit chance         |                                 75% |
| Combo: +5% tap / punkt  | baza max 25, decay 1.2 /s (min 0.2) |
| Próg Frenzy / Overdrive |                         10 / 15 CPS |
| Offline cap             |                  8 h baza, max 24 h |
| Bathroom Break          |              1 ładunek / 4 h, max 2 |
| Auto-Buy GTP            |                                2000 |

### Globalny mnożnik

```text
flushMult     = 1 + FP × 0.05                    gdy FP ≤ 500
              = 1 + 25 + (FP − 500) × 0.025      gdy FP > 500
worldBonus    = 1 + bonus świata                 (0% … +75%)
permanent     = 1 + bonus milestone’u            (+25% przy 50, +50% przy 100)
paid          = 1 albo 2                         (Convenience Pack)
globalBonus   = suma efektów global_production   (Royal Flush / osiągnięcia)
boostIdle     = iloczyn aktywnych boostów idle

globalMultiplier = flushMult × worldBonus × permanent × paid
                 × (1 + globalBonus) × boostIdle
```

Przykład: 20 Flush Power, Castle Keep (+5%), bez packa → `1.20 × 1.05 = 1.26`.

### Tap

```text
tapMultiplier = (1 + tap_multiplier + tap_power)
              × boostTap × flushMult × worldBonus
              × permanent × paid × (1 + globalBonus)

tapPower = 1 × tapMultiplier × (1 + 0.05 × combo)

jeśli crit: tapPower × critMultiplier
```

`tap_multiplier` i `tap_power` sumują się addytywnie z upgrade’ów runu, Royal Flush i claimed achievements. Combo widać na HUD od 2. Boost tapa (Bathroom Break, streak dzień 3) **nie** wchodzi do `globalMultiplier` — tylko do tapa.

Frenzy (8 s + bonus czasu, gdy CPS ≥ próg) to stan UI / daily / achievement. **Nie mnoży** tapa ani idle.

### Idle (PP/s)

Dla każdego generatora z poziomem > 0:

```text
pps = baseProduction × poziom
    × (1 + generator_production)
    × milestoneMult
    × (1 + idle_multiplier)
    × globalMultiplier
```

Milestone’y (ten sam budynek): 10×2, 25×2, 50×3, 100×3, 250×4, 500×5, 1000×10. Mnożą się przez siebie.

Suma po generatorach to `pps` na HUD. Tick ekonomii co ~100 ms dopisuje `pps × dt`.

### Offline

```text
earned = pps × min(czas_away, offlineCap)
offlineCap = min(24 h, 8 h + bonusy offline_cap)
```

Poniżej 5 s away nie ma nagrody. Claim może podwoić za rewarded ad.

## Koszty

Wszystkie zakupy PP / GTP poziomowe używają tego samego wzrostu:

```text
koszt(poziom) = baseCost × growth^poziom
seria(n)      = first × (r^n − 1) / (r − 1)
```

Buy Multiplier `x1 / x10 / x25` sumuje serię. MAX to binary search `maxAffordableCount` (cap 10 000 poziomów na klik).

| Rodzaj                        | Wzrost        | Uwagi                                                                       |
| ----------------------------- | ------------- | --------------------------------------------------------------------------- |
| Generatory                    | 1.12 → 1.25   | Późniejsze budynki drożeją szybciej                                         |
| Upgrade’y tap (tier)          | 1.35 → 2.05   | `TIER_GROWTH` w `upgrades.ts`                                               |
| Upgrade’y combo / crit / idle | 1.5 → 2.1     | Osobno per item                                                             |
| Turbo Servo (Faster Auto-Buy) | 1.75 / poziom | 10 poziomów, węzeł Royal Flush `rf_autobuy_speed`, start 20 GTP, próg 20 FP |
| Royal Flush                   | 1.45 → ~1.6   | Płatne **GTP**; Flush Power tylko jako próg (`flushPower ≥ baseCost`)       |

Turbo Servo jest permanentne (Flush Power + GTP). Legacy `autoBuySpeedLevel` migracja scala poziomy do `royalFlushLevels.rf_autobuy_speed` (max, bez utraty poziomów).

Auto-Buy kupuje **jeden** odblokowany, opłacalny generator albo upgrade co 15–5 s według strategii BALANCED / PRODUCTION / TAP / SMART. Nie kupuje Turbo Servo.

## Flush (prestiż)

Wymóg: **25 000** `runPPEarned`.

```text
flushPowerGain = max(1, floor(10 × (runPP / 25 000)^0.33 × (1 + dailyBonus)))
dailyBonus     = 0.25 przy pierwszym Flushu dnia UTC, inaczej 0
```

Przy dokładnie 25 000 PP zysk to **10** Flush Power (bez daily). Dalszy PP rośnie z wykładnikiem 0.33 — opłaca się zbierać więcej niż minimum, ale z malejącym zwrotem.

**Reset:** current PP, run PP, generatory, upgrade’y runu, milestone’y generatorów, boosty, event, session taps.

**Zostaje:** Flush Power, liczba Flushy, GTP, IAP, Auto-Buy + prędkość, Royal Flush, skiny, światy, osiągnięcia.

Po Flushu 3+ nowy run startuje z 5 minutami PPS (liczone **po** resecie, więc bez starych generatorów — bonus jest mały, dopóki Apprentice Plunger nie da Internowi poziomu 5 przy Flushu 10).

## Źródła PP

| Źródło                     | Ile                                                     |
| -------------------------- | ------------------------------------------------------- |
| Tap                        | `tapPower`, ewentualnie × crit                          |
| Idle                       | `pps` co tick                                           |
| Offline                    | `pps × czas` do capu; ad może ×2                        |
| Sukces eventu              | `pps × rewardPpMinutes × 60 × eventMult`                |
| Golden Poop Shower (catch) | `tapPower × 40` za każdą kupę (osobno od nagrody końca) |
| Skrzynia                   | 2 / 5 / 12 minut PPS (waga zależy od tieru)             |
| Bathroom Break             | 15 minut PPS **albo** 2× tap na 10 min                  |
| Rewarded Instant PPS       | 1 minuta PPS                                            |
| Start runu (Flush 3+)      | 5 minut PPS po resecie                                  |

Mnożnik nagród eventu:

```text
eventMult = 1 + event_reward (RF / osiągnięcia) + milestoneEventBonus
milestoneEventBonus = +10% od 5 Flushy, +25% od 15
```

Baza eventu (przed mnożnikiem):

| Event              | GTP | Minuty PP |
| ------------------ | --: | --------: |
| Golden Poop        |   5 |         3 |
| Golden Poop Shower |  15 |         2 |
| Plumber Inspection |  12 |         4 |
| Mega Clog          |  20 |        10 |

Shower: do 30 catchy × 40 tapów w 15 s — to główny burst PP, nie końcowe 2 minuty.

## Źródła GTP

| Źródło                           | Typowa kwota                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Event (sukces)                   | 5–20 × `eventMult`                                                                   |
| Daily challenge (3 / dzień)      | 8–25 szablon                                                                         |
| Daily Toilet Chest (3/3 claimed) | 40 + 5 × cykl streaka                                                                |
| Streak dzień 1–7                 | 5, 8, 0, 12, 0, 20, 50 × (1 + 0.15 × (cykl−1)); dzień 5 +15; dzień 3 = 2× tap 15 min |
| Daily Dump (1 / UTC)             | 0 / 8 / 15 / 25 / 40 (none→diamond)                                                  |
| Session missions                 | 2 + 3 + 5, **cap 20 GTP / dzień**                                                    |
| Osiągnięcia                      | zwykle 5–60; hidden do 300                                                           |
| Skrzynia (roll)                  | 5–100 zależnie od tieru                                                              |
| IAP                              | 50 / 180 / 350 / 800 / 2000; Tycoon +250                                             |

Streak: cykl max 5. Dni 3 i 5 w tabeli bazowej dają 0 GTP (dzień 3 to boost, dzień 5 dostaje +15). Saver: 1 dzień przerwy przy ładunku (max 2; +1 przy dniu 7).

## Ujścia GTP

| Ujście                          | Koszt                                                                      |
| ------------------------------- | -------------------------------------------------------------------------- |
| Auto-Buy unlock                 | 2000 (albo Convenience Pack)                                               |
| Regular / silver / golden chest | 8 / 20 / 45                                                                |
| Regular / silver / golden key   | 35 / 90 / 220                                                              |
| Royal Flush                     | `floor(baseCost × growth^poziom)` GTP; próg Flush Power = `baseCost` węzła |
| Skiny GTP                       | 25–1500 (stare ID + materiały P4)                                          |

Skrzynia + klucz to netto sink: np. regular 8+35 = 43 GTP, EV rolla to głównie 5–10 GTP plus rzadki shower. Klucze są droższe niż skrzynie z założenia.

## IAP i ads

Nic w core loop nie wymaga płatności ani reklamy.

| Produkt          |   Cena | Grant                                        | GTP / $ (grube) |
| ---------------- | -----: | -------------------------------------------- | --------------: |
| Remove Ads       |  $2.99 | Brak interstitiali                           |               — |
| Small GTP        |  $0.99 | 50                                           |             ~50 |
| Medium           |  $2.99 | 180                                          |             ~60 |
| Large            |  $4.99 | 350                                          |             ~70 |
| Huge             |  $9.99 | 800                                          |             ~80 |
| Mega             | $19.99 | 2000                                         |            ~100 |
| Toilet Tycoon    |  $6.99 | Ads off + 250 GTP + skin                     |               — |
| Convenience Pack | $29.99 | Auto-Buy + stałe **2×** tap i idle + ads off |     po 1 Flushu |

Rewarded (cooldown **10 min** na placement):

| Placement      | Efekt                             |
| -------------- | --------------------------------- |
| Income Boost   | 2× idle, 5 min                    |
| Instant PPS    | 1 minuta PPS                      |
| Golden Spawn   | Golden Poop Shower                |
| Event Retry    | przyspiesza następny losowy event |
| Double offline | ×2 claimu offline                 |
| Daily reroll   | 1 / UTC dzień                     |

Interstitiale: po Flush / shop / zmianie świata, nie przy evencie/frenzy, nie w 120 s po rewarded, nie przy Remove Ads.

## Boosty czasowe

Wchodzą do `activeBoosts` i mnożą się.

| Boost                      | Tap | Idle |   Czas |
| -------------------------- | --: | ---: | -----: |
| Ad Income Boost            |  ×1 |   ×2 |  5 min |
| Bathroom Break (opcja tap) |  ×2 |   ×1 | 10 min |
| Streak dzień 3             |  ×2 |   ×1 | 15 min |

Idle boost siedzi w `globalMultiplier` (wszystkie generatory). Tap boost tylko w `tapMultiplier`.

## Pacing i late game

- Wczesny run: tap + Intern / Fiber Farmer do 25 000 PP.
- Po 1 Flushu: Royal Flush (GTP + próg FP), nowe światy, Convenience Pack, generatory od Quantum Septic.
- Po 10 Flushach: Intern startuje na 5; Neon / Royal Chamber odblokowane wcześniej jako tła.
- Po 50 / 100: +25% / +50% stałej produkcji — to osobny mnożnik, nie Flush Power.

Liczby late-game idą przez `LargeNumber` (mantissa + exponent). Koszty generatorów kończą na 1e24 przy wzroście 1.25.

Symulacja `tests/economy/economySimulation.test.ts` odpala profile (nowy gracz → 100 Flushy) i pilnuje, żeby ściany zakupu / Flusha zostawały w rozsądnym czasie przy 5 tap/s.

## Czego ekonomia świadomie nie robi

- Frenzy nie mnoży PP.
- Flush Power nie jest wydawane — tylko próg Royal Flush.
- Zakup generatora/upgrade’u nie obcina `runPPEarned`.
- Auto-Buy nie przyspiesza się sam (Turbo Servo jest ręczne, permanentne, za GTP).
- Daily Dump punktuje tap niezależnie od tap power runu (fair PvE dnia).
