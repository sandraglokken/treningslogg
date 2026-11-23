// Startprogram (knerehab). type: weight | bodyweight | time
const ex = (id, name, sets, reps, note = '', type = 'weight', perSide = false) =>
  ({ id, name, sets, reps, note, type, perSide });

export const SEED_PROGRAM = {
  sessions: [
    {
      id: 's1', name: 'Økt 1', focus: 'Bein, styrke + rygg', minutes: 60, priority: 'Må',
      warmup: { minutes: '5-8', note: 'Sykkel, kneløft og rumpeaktivering med strikk. Hofteaktivering, 2 sett: sidesteg med strikk (10 per side) og sideplanke på kne med benløft (6-8 per side)' },
      exercises: [
        ex('e1', 'Beinpress', 3, '8-10', 'Kontrollert tempo'),
        ex('e2', 'Hip thrust', 3, '8-10'),
        ex('e3', 'Ettbens rumensk markløft', 3, '8', 'Ettbensøvelsen: tar rumpe og hamstring, trener balanse uten mye knebøy', 'weight', true),
        ex('e4', 'Legextension', 3, '12', 'Lett vekt, bruk bevegelsesutslaget fysioen har anbefalt'),
        ex('e5', 'Tåhev', 3, '12-15'),
        ex('e6', 'Nedtrekk', 3, '8-10', 'Rygg'),
        ex('e7', 'Sittende roing', 3, '10', 'Rygg'),
        ex('e8', 'Ettbens hoftehev på gulvet', 3, '6-8', 'Sidehofte og rumpe. Start med hoftehev med to bein, så marsj, så ett bein i luften', 'bodyweight', true),
      ],
    },
    {
      id: 's2', name: 'Økt 2', focus: 'Bein, stabilitet og spenst + core', minutes: 55, priority: 'Må',
      warmup: { minutes: '5', note: 'Sykkel eller romaskin, hofteaktivering (2 sett sidesteg med strikk, 10 per side) og lette hopp' },
      exercises: [
        ex('e9', 'Hoppetau', 5, '40', '', 'bodyweight'),
        ex('e10', 'Hinking over hindre', 4, '6', 'Start fremover, landing som «stikker» i 2 sek. Deretter sideveis, så flere hopp i sekvens', 'bodyweight', true),
        ex('e11', 'Utfall mot bosuball', 3, '6-8', 'Øk farten mot ballen litt etter litt', 'weight', true),
        ex('e12', 'Rygghev for rumpe/hamstring', 3, '10-12'),
        ex('e13', 'Ettbens beinpress', 3, '10', '', 'weight', true),
        ex('e14', 'Sideplanke med benløft', 3, '6-8', 'Core og sidehofte. Start på kne, gå til full sideplanke når du mestrer det', 'bodyweight', true),
        ex('e15', 'Pallof press', 3, '10', 'Core', 'weight', true),
      ],
    },
    {
      id: 's3', name: 'Økt 3', focus: 'Rygg/overkropp + kondisjon', minutes: 55, priority: 'Bør',
      warmup: null,
      exercises: [
        ex('e16', 'Pull-ups eller nedtrekk', 4, '6-8', 'Bruk assistanse ved behov'),
        ex('e17', 'Enarms hantelroing', 3, '8-10', '', 'weight', true),
        ex('e18', 'Kabelroing', 3, '10-12', 'Smal/nøytral grep'),
        ex('e19', 'Face pulls', 3, '15'),
        ex('e20', 'Skulderpress eller brystpress', 3, '8-10'),
        ex('e21', 'Kondisjon: motbakke på tredemølle', 1, '15-20 min', 'Gange, 8-12 % stigning', 'time'),
      ],
    },
    {
      id: 's4', name: 'Økt 4', focus: 'Kondisjon + mobilitet', minutes: 45, priority: 'Valgfri',
      warmup: null,
      exercises: [
        ex('e22', 'Intervaller', 5, '3 min hardt / 2 min rolig', 'Romaskin, skiergometer eller motbakke-gange', 'time'),
        ex('e23', 'Mobilitet + litt core', 1, '10 min', 'Hofte og legger', 'time'),
      ],
    },
  ],
};

export const TIPS = {
  week: 'Bare 2 økter denne uka? Ta økt 1 og 2, så får du beinene to ganger. Har du tid til en tredje, er det økt 3. Legg minst 48 timer mellom beinøktene.',
  progression: [
    ['Styrkeøvelser', 'Øk vekten litt når du klarer alle sett og reps med god kontroll'],
    ['Hinking', 'Fremover, så sideveis, så sekvenser, så høyere hindre'],
    ['Variasjon', 'Hver 4.-6. uke: bytt enkelte øvelser, f.eks. hip thrust mot ettbens hip thrust, eller roing mot enarms kabelroing'],
    ['Sidehofte', 'Sideplanke på kne, så full sideplanke med benløft. Hoftehev med to bein, så marsj, så ett bein i luften'],
  ],
  knee: [
    'Hold smerten på maks 3 av 10 under øvelsen, og ingen økt hevelse neste dag.',
    'Utfall, hinking og legextension belaster bruskbaksiden av kneskålen mest, så følg fysioens råd om dybde og vekt.',
    'Spør fysioen om planen passer med hva dere har lagt opp til nå, spesielt hinking og legextension.',
  ],
};
