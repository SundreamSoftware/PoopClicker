# Shop, Flush i HUD

Jak jest ułożony sklep, co robi każdy generator i upgrade, jak działa Flush oraz co pokazuje pasek statystyk nad sceną.

Źródło: `ShopPanel`, `generators.ts`, `upgrades.ts`, `flushMilestones.ts`, `FlushPanel`, top-bar w `App.tsx`, `production.ts`.

|                   |     |
| ----------------- | --- |
| Taby w sklepie    | 5   |
| Generatory        | 22  |
| Upgrade’y runu    | 53  |
| Milestone’y Flush | 8   |

## Pętla gry

Play to scena tapowania. Sklep wydaje dwie waluty: **PP** (Poop Points — tap i idle) oraz **GTP** (Golden Toilet Paper — eventy, skrzynie, IAP). **Flush** to prestiż: czyści obecny run i zamienia run PP na stałe Flush Power. Pasek nad sceną to żywy odczyt tych walut i mnożników.

Tap i generatory robią PP. PP kupuje siłę runu. Flush zamienia ten run w Flush Power, które mnoży każdy kolejny tap i tick idle. GTP kupuje wygodę i skrzynie, nie bazową produkcję.

| Miejsce           | Waluta               | Na co idzie                                     | Czy przeżywa Flush?        |
| ----------------- | -------------------- | ----------------------------------------------- | -------------------------- |
| Shop · Generators | PP                   | Budynki idle (PP/s)                             | Nie — poziomy się resetują |
| Shop · Upgrades   | PP                   | Bonusy tap / combo / crit / idle                | Nie — poziomy się resetują |
| Shop · Auto-Buy   | GTP, potem PP        | Odblokowanie Auto-Buy; poziomy prędkości za PP  | Tak                        |
| Shop · Boosts     | Reklamy rewarded     | 2× idle, instant PP, shower, retry eventu       | Boosty wygasają            |
| Shop · Chests     | GTP                  | Skrzynie + klucze; nagrody GTP / PP / shower    | Ekwipunek tak              |
| Shop · Store      | Pieniądze            | Wyłączenie reklam, paczki GTP, Convenience Pack | Tak                        |
| Flush panel       | Run PP → Flush Power | Prestiż + drzewko Royal Flush                   | Flush Power tak            |

## Układ sklepu

Shop to zakładka w dolnym navie, nie modal. Otwiera się zamiast sceny Play. Jeden scroll: karta Auto-Buy, przełącznik Buy Multiplier, potem pięć tabów.

### Zawsze widoczne (nad tabami)

**Auto-Buy**

- Odblokowanie: **2000 GTP** (wartość paczki Mega $19.99) albo **Convenience Pack $29.99** po pierwszym Flushu.
- Kompakt `AUTO: ON / OFF` w sticky headerze Shop; konfiguracja (strategie, kategorie, Turbo Servo) w arkuszu.
- Kupuje **jeden** item na raz według strategii: BALANCED, PRODUCTION, TAP, SMART.
- Bazowy interwał: **15 s**.
- **Turbo Servo**: 10 trwałych poziomów Royal Flush / GTP (`rf_autobuy_speed`). Każdy skraca interwał o 1 s (**15 s → 5 s**). Legacy poziomy PP są migrowane, nie resetowane.

**Buy Multiplier**

Cykl: `x1 → x10 → x25 → MAX`. Określa, ile poziomów generatora kupuje jeden tap Buy. MAX wydaje tyle, na ile starczy PP. Upgrade’y zawsze kupują 1 poziom. Auto-Buy zawsze kupuje 1 item i ignoruje ten przełącznik.

### Cztery obszary

| Tab        | Zawartość                                                     | Blokady / widoczność                                    |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| Production | Generatory: poziom, PP/s, delta, koszt, next milestone        | Lista = Flush + 1. Sticky BUY x1/x10/x25/MAX            |
| Upgrades   | Grupy TAP / COMBO·FRENZY / CRIT / IDLE + summary cards        | Dostępne + następne + jeden teaser. Nie płaska lista 53 |
| Power-Ups  | Boosts + Inventory (OPEN) + Acquisition (GET KEY / GET CHEST) | Open wymaga skrzyni + klucza i braku eventu             |
| Premium    | Play Billing: Remove Ads, paczki GTP, Convenience Pack        | Convenience Pack od 1 Flusha. Restore Purchases         |

### Mechaniki sklepu

| Reguła             | Szczegół                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Koszt generatora   | Geometryczny: następny poziom = `baseCost × growth^poziom`. Buy Multiplier sumuje szereg             |
| Koszt upgrade’u    | Ta sama formuła. Domyślnie max 25 poziomów; późne mają 5–15                                          |
| Unlock generatorów | Wczesne: lifetime lub current PP. Od Quantum Septic: też liczba Flushy                               |
| Unlock upgrade’ów  | Poprzedni upgrade, liczba Flushy albo świat (Quantum Pooping wymaga Ice Chamber)                     |
| Kolory             | Wiersze generatorów: can-afford / cannot-afford. Locked pokazuje brakujący Flush albo PP             |
| Skrzynie           | Regular / silver / golden. 40% GTP poniżej kosztu, 20% powyżej, 10–30 min PP, combo, 2× idle, shower |

**IAP (Store)**

- Remove Ads — $2.99
- Paczki GTP: 50 / 180 / 350 / 800 / 2000
- Toilet Tycoon Pack — $6.99: wyłączenie reklam + 250 GTP + skin
- Convenience Pack — $29.99 (po 1 Flushu): Auto-Buy + wyłączenie reklam + 4 h offline + 1 ładunek Bathroom Break. Stare save’y z 2× produkcji zachowują mnożnik.

## Generatory

Każdy posiadany poziom dodaje bazowe PP/s tego budynku. Potem mnożą to: upgrade’y idle, upgrade’y produkcji generatorów, kamienie milowe poziomu, Flush Power, bonus świata, stałe bonusy z milestone’ów Flush oraz legacy 2× z Convenience Pack (tylko stare zakupy).

Wszystkie 22 generatory mają tę samą drabinę milestone’ów. Próg mnoży **tylko ten** budynek: 10×2, 25×2, 50×3, 100×3, 250×4, 500×5, 1000×10.

Tab Generators pokazuje budynki odblokowane przy Twoim Flushu + 1, więc następny prestiż widać, ale jest zablokowany. Opisy to żarty — mechanicznie zawsze chodzi o „tyle PP/s na poziom”.

| Nazwa                          | Bazowe PP/s | Bazowy koszt | Wzrost | Unlock     |
| ------------------------------ | ----------: | -----------: | -----: | ---------- |
| Plunger Intern                 |         0.1 |           15 |   1.12 | Start      |
| Fiber Farmer                   |           1 |          100 |   1.13 | 50 PP      |
| Bathroom Bard                  |           8 |         1.1K |   1.14 | 500 PP     |
| Porta-Potty Fleet              |          47 |          12K |   1.15 | 5K PP      |
| Sewer Syndicate                |         260 |         130K |   1.15 | 50K PP     |
| Chili Refinery                 |        1.4K |         1.4M |   1.16 | 400K PP    |
| Office Toilet Network          |        7.8K |          20M |   1.16 | 5M PP      |
| Luxury Bidet Lab               |         44K |         330M |   1.17 | 80M PP     |
| Space Station Loo              |        260K |         5.1B |   1.17 | 1B PP      |
| Quantum Septic Tank            |        1.6M |          75B |   1.18 | 1 Flush    |
| Temporal Restroom              |         10M |           1T |   1.18 | 3 Flushe   |
| Galactic Septic Tank           |         65M |          14T |   1.19 | 5 Flushy   |
| Black Hole Plumber             |        430M |         170T |   1.19 | 8 Flushy   |
| Multiverse Bidet Network       |        2.9B |        2.1Qa |   1.20 | 10 Flushy  |
| Chrono Toilet                  |         21B |         26Qa |   1.20 | 12 Flushy  |
| Reality Recycling Plant        |        150B |        310Qa |   1.21 | 15 Flushy  |
| Cosmic Colon Collider          |        1.1T |        3.8Qi |   1.21 | 20 Flushy  |
| Universal Brown Matter Reactor |        8.3T |         46Qi |   1.22 | 25 Flushy  |
| Infinite Bathroom Bureaucracy  |         62T |        550Qi |   1.22 | 35 Flushy  |
| Toilet Singularity             |        470T |        6.6Sx |   1.23 | 50 Flushy  |
| Omniversal Sewer               |       3.5Qa |         80Sx |   1.24 | 75 Flushy  |
| Final Flush Foundry            |        25Qa |          1Sp |   1.25 | 100 Flushy |

## Upgrade’y

Kupowane za PP, **reset przy Flushu**. Efekty dodają się per poziom i wchodzą do formuły produkcji (tap, idle PPS, crit, combo, frenzy). Późne wymagają liczby Flushy; Quantum Pooping wymaga też świata Ice Chamber.

Rozkład: 30 tap · 10 combo/frenzy · 10 crit · 3 idle.

**Faster Auto-Buy nie jest na tej liście** — siedzi na karcie Auto-Buy, więc Auto-Buy nie kupuje sam sobie prędkości. Węzły Royal Flush są na arkuszu Flush i kosztują Flush Power, nie PP.

### Tap (30)

Każdy poziom dodaje podany procent do mnożnika tapa.

| Nazwa                     | Na poziom         | Max | Unlock                      |
| ------------------------- | ----------------- | --: | --------------------------- |
| More Fiber                | +15% tap          |  25 | Start                       |
| Premium Fiber             | +20% tap          |  25 | Needs More Fiber            |
| Questionable Burrito      | +25% tap          |  25 | Needs Premium Fiber         |
| Emergency Espresso        | +30% tap          |  25 | Start                       |
| Double Espresso           | +35% tap          |  25 | Needs Emergency Espresso    |
| Chili Accelerator         | Splash co 5 tapów |  25 | Start                       |
| Triple Chili Disaster     | Silniejszy splash |  25 | Needs Chili Accelerator     |
| Reinforced Toilet Seat    | Tap bierze % PPS  |  25 | Start                       |
| Titanium Toilet Seat      | Milestone → tap   |  25 | Needs Reinforced Seat       |
| Industrial Plunger        | +60% tap          |  25 | Start                       |
| Hydraulic Plunger         | +70% tap          |  25 | Start                       |
| Diamond Plunger           | +80% tap          |  25 | Needs Hydraulic Plunger     |
| Turbo Digestion           | +90% tap          |  25 | Start                       |
| Military Grade Fiber      | +100% tap         |  25 | Start                       |
| Advanced Bathroom Physics | Best gen amp      |  25 | Start                       |
| Experimental Digestion    | +125% tap         |  25 | 1 Flush                     |
| NASA Flush Technology     | +140% tap         |  25 | 1 Flush + Experimental      |
| Nuclear Fiber             | +160% tap         |  25 | 3 Flushe                    |
| Quantum Pooping           | +200% tap         |  15 | 10 Flushy + Ice Chamber     |
| Dark Matter Digestion     | +220% tap         |  15 | 12 Flushy + Quantum Pooping |
| Antimatter Burrito        | +250% tap         |  12 | 15 Flushy                   |
| Relativistic Taco         | +280% tap         |  12 | 18 Flushy                   |
| Temporal Digestion        | +320% tap         |  10 | 20 Flushy                   |
| Interdimensional Fiber    | +360% tap         |  10 | 25 Flushy                   |
| Multiverse Metabolism     | +400% tap         |  10 | 30 Flushy                   |
| Reality-Bending Burrito   | +450% tap         |   8 | 40 Flushy                   |
| Infinite Digestion        | +500% tap         |   8 | 50 Flushy                   |
| Forbidden Taco            | +550% tap         |   8 | 60 Flushy                   |
| The Brown Equation        | +600% tap         |   5 | 75 Flushy                   |
| Ultimate Poop Theory      | +800% tap         |   5 | 100 Flushy                  |

### Combo i frenzy (10)

| Nazwa                  | Efekt na poziom         | Max | Unlock    |
| ---------------------- | ----------------------- | --: | --------- |
| Sticky Combo           | −0.05 combo decay /s    |  20 | Start     |
| Combo Ceiling Raise    | +2 max combo            |  15 | Start     |
| Frenzy Warm-Up         | −0.3 próg Frenzy CPS    |  10 | Start     |
| Frenzy Encore          | +0.5 s trwania Frenzy   |  10 | Start     |
| Overdrive Gloves       | +0.35× crit w Overdrive |   8 | 1 Flush   |
| Rhythm Plumbing        | Combo podnosi crit      |  10 | 2 Flushe  |
| Combo Insurance        | −0.08 combo decay /s    |  12 | 8 Flushy  |
| Frenzy Festival        | Frenzy bufuje PPS       |   8 | 12 Flushy |
| Maximum Poopacity Prep | −0.4 próg Frenzy CPS    |   6 | 25 Flushy |
| Eternal Combo          | Combo 8+ → PPS          |   5 | 40 Flushy |

### Crit (10)

Bazowy crit: **2% szansy × 5**. Szansa jest ucięta na **75%**.

| Nazwa                 | Efekt na poziom           | Max | Unlock    |
| --------------------- | ------------------------- | --: | --------- |
| Lucky Seat            | +0.5% crit chance         |  20 | Start     |
| Crit Plunger          | +0.5× crit multiplier     |  15 | Start     |
| Precision Wipe        | +0.8% crit chance         |  15 | Start     |
| Golden Flush Instinct | Golden przedłuża Frenzy   |  12 | Start     |
| Critical Mass         | +1% crit chance           |  10 | 1 Flush   |
| Chain Reaction Seat   | Crit może się łańcuchować |   8 | 3 Flushe  |
| Supernova Splat       | +1.0× crit multiplier     |  10 | 10 Flushy |
| Probability Plunger   | +1.5% crit chance         |   8 | 15 Flushy |
| Destiny Dump          | +1.5× crit multiplier     |   6 | 30 Flushy |
| Final Crit Form       | +2% crit chance           |   5 | 50 Flushy |

### Idle (3)

Offline cap startuje od **8 h** i nie przekroczy **24 h**, nawet z węzłami Royal Flush.

| Nazwa                | Efekt na poziom            | Max | Unlock |
| -------------------- | -------------------------- | --: | ------ |
| Night Light Loo      | +10% idle                  |  20 | Start  |
| Auto-Flush Firmware  | +15% produkcja generatorów |  15 | Start  |
| Long Meeting Bladder | +1 h offline cap           |   5 | Start  |

## Flush

Flush to prestiż. Przycisk na Play otwiera arkusz. Wymagane: **25 000 PP zarobione w tym runie**. Potwierdzenie zamienia run w Flush Power i startuje nowy run.

### Co zyskujesz

| Nagroda            | Jak liczona                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Flush Power        | `floor(10 × (runPP / 25 000)^0.33)`, minimum 1. Pierwszy Flush dnia UTC: +25%. Soft-cap po 500 Flush Power |
| Globalna produkcja | +5% tap i idle na punkt Flush Power do 500, potem +2.5% na punkt. Na HUD jako linia mnożnika               |
| Światy             | Nowe toalety od liczby Flushy. Każdy świat dodaje bonus produkcji                                          |
| Milestone’y        | Stałe bonusy przy 1 / 3 / 5 / 10 / 15 / 25 / 50 / 100 Flushach                                             |

### Co znika, a co zostaje

**Reset:** current PP, run PP, poziomy generatorów, upgrade’y runu, claimed milestone’y generatorów, aktywne boosty, żywy event, session tap count.

**Zostaje:** Flush Power, liczba Flushy, GTP, skrzynie/klucze, skiny, światy, Auto-Buy + poziomy prędkości, granty IAP, zakupy Royal Flush, osiągnięcia, ustawienia.

### Milestone’y

| Flushe | Nazwa              | Stały efekt                                          |
| -----: | ------------------ | ---------------------------------------------------- |
|      1 | Royal Flush Tree   | Odblokowuje drzewko za Flush Power                   |
|      3 | Warm Seat Start    | Nowy run startuje z 5 minutami obecnego PPS          |
|      5 | Event Warmup       | +10% nagród z eventów                                |
|     10 | Apprentice Plunger | Start z Plunger Intern na poziomie 5; skin King Poop |
|     15 | Event Magnet       | +25% nagród z eventów; skin Nuclear Poop             |
|     25 | Diamond Poop       | Kosmetyk Diamond                                     |
|     50 | Permanent Pressure | +25% stałej produkcji; Multiverse Poop               |
|    100 | Royal Throne       | +50% stałej produkcji; świat Omni Throne; Final Poop |

### Royal Flush

Po pierwszym Flushu ten sam arkusz pokazuje drzewko płatne **Flush Power** (nie PP). Pięć gałęzi: Pressure (tap / crit), Plumbing (generatory / global), Combo, Idle, Luck (golden chance / nagrody eventów). Węzły mają wymagania i własne progi Flush. Zakupy są na zawsze.

### Światy od Flushy

| Flush | Świat              | Bonus produkcji |
| ----: | ------------------ | --------------: |
|     0 | Grimy Bathroom     |              0% |
|     1 | Castle Keep        |             +5% |
|     2 | Haunted Stall      |             +8% |
|     3 | Brassworks         |            +10% |
|     5 | Neon Sprawl        |            +15% |
|     6 | Ice Chamber        |            +20% |
|     7 | Renovated Bathroom |            +25% |
|     8 | Bamboo Spa         |            +30% |
|     9 | Marble Suite       |            +35% |
|    10 | Royal Chamber      |            +40% |
|    15 | Palace Vault       |            +50% |
|    25 | Royal Throne       |            +75% |

## Pasek statystyk nad sceną

Top-bar jest kontekstowy: ten sam komponent, inne priorytety.

- **Play:** PP, PP/s, CPS, combo, postęp Flush
- **Shop:** PP, PP/s, GTP
- **Prestige:** Flush Power, zysk, mnożnik, next milestone
- Tap w globalny mnożnik otwiera breakdown z `computeMultiplierBreakdown` (ta sama logika co produkcja).

| Odczyt         | Znaczenie                                                                                 | Kiedy się zmienia                                         |
| -------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| PP             | Wydawalne Poop Points w tym runie. Tap, idle, eventy, skrzynie, offline                   | Każdy tick ekonomii i każdy tap                           |
| GTP            | Golden Toilet Paper. Auto-Buy, skrzynie/klucze, część skinów. Eventy, daily, IAP          | Przy grantcie albo wydatku                                |
| CPS            | Średnie kliknięcia na sekundę. Napędza Frenzy / Overdrive i Plumber Inspection            | Na bieżąco z ostatnich tapów                              |
| PP/s           | Idle z generatorów po wszystkich mnożnikach                                               | Gdy zmienią się geny, upgrade’y, Flush, świat albo boosty |
| COMBO          | Tylko od combo 2+. Każdy punkt to +5% tap. Maleje z czasem                                | Przy tapie; spada co tick                                 |
| Flush Power    | Dożywotnie punkty prestiżu. Tooltip: prestiż pod Royal Flush                              | Po każdym Flushu                                          |
| Linia mnożnika | Flush Power × świat × stały milestone × paid (legacy 2×) × global upgrade’y × boosty idle | Gdy któreś z tego się zmieni                              |

### Pod sceną (nie w top-barze)

| Element            | Co pokazuje                                                           |
| ------------------ | --------------------------------------------------------------------- |
| Next goal          | Krótkoterminowy cel: milestone generatora, claim, daily, Flush, świat |
| UPGRADE ↑ / BOOSTS | Quick Shop i rewarded boosts bez opuszczania Play                     |
| Przycisk FLUSH     | Pulsuje, gdy gotowy. Otwiera arkusz Prestige (Flush + Permanent)      |
| Missions / Streak  | Skok do Daily, jeśli coś do odbioru; inaczej przycisk streaka         |

### Matematyka za HUD-em

Bazowy tap to **1 PP**. Mnożą go: upgrade’y tap, combo `(1 + 0.05 × combo)`, Flush Power, bonus świata, bonusy stałe i ewentualny legacy 2× z Convenience Pack. Crity liczą się osobno (bazowo 2% × 5). Idle PP/s = baza generatora × poziomy × milestone’y × upgrade’y idle/generator × ten sam globalny mnożnik.

## Build archetypes (P2)

Te same ID upgrade’ów. Zmienił się efekt, nie save. Wczesne `+X% tap` zostają kręgosłupem TAPPERA.

| Archetyp | Jakościowe ID                                                                                              | Mechanika                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| TAPPER   | `chili_accelerator`, `triple_chili_disaster`, `chain_reaction_seat`, `rhythm_plumbing`, `overdrive_gloves` | Splash co 5 tapów, crit chain, combo→crit, Overdrive crit                     |
| IDLER    | `frenzy_festival`, `advanced_bathroom_physics`                                                             | Frenzy bufuje PPS, najlepszy generator dostaje amp                            |
| HYBRID   | `reinforced_toilet_seat`, `titanium_toilet_seat`, `eternal_combo`, `golden_flush_instinct`                 | Tap bierze % PPS, milestone→tap, combo 8+ budzi idle, Golden przedłuża Frenzy |
