export const LOCALES = ['en', 'de', 'it', 'fr', 'nl', 'jam'] as const;
export type Locale = (typeof LOCALES)[number];

export interface Messages {
	app: {
		title: string;
		tagline: string;
		langLabel: string;
		themeLabel: string;
		theme_auto: string;
		theme_light: string;
		theme_dark: string;
	};
	form: {
		section_when: string;
		section_recipe: string;
		section_advanced: string;
		startAt: string;
		startAt_help: string;
		startAt_now: string;
		readyBy: string;
		readyBy_help: string;
		info_heading: string;
		info_intro: string;
		info_q10_title: string;
		info_q10_caption: string;
		info_units_title: string;
		info_units_body: string;
		info_units_fresh: string;
		info_units_sourdough: string;
		info_units_solve: string;
		info_switch_title: string;
		info_switch_body: string;
		info_mass_title: string;
		info_mass_body: string;
		info_mass_caption_fresh: string;
		info_mass_caption_sourdough: string;
		info_night_title: string;
		info_night_body: string;
		pizzaCount: string;
		ballWeight: string;
		ballWeight_round: string;
		ballWeight_round_help: string;
		hydration: string;
		hydration_help: string;
		salt: string;
		yeastType: string;
		yeast_fresh: string;
		yeast_sourdough: string;
		starterHydration: string;
		starterHydration_help: string;
		roomTemp: string;
		roomTemp_help: string;
		preFerment: string;
		preFerment_none: string;
		preFerment_biga: string;
		preFerment_poolish: string;
		preFermentFlour: string;
	};
	mode: {
		cold: string;
		room: string;
		cold_blurb: string;
		room_blurb: string;
	};
	steps: {
		preferment_mix: string;
		preferment_mix_desc: string;
		preferment_proof: string;
		preferment_proof_desc: string;
		prep: string;
		prep_desc: string;
		mix: string;
		mix_desc: string;
		mix_desc_with_preferment: string;
		bulk_room: string;
		bulk_room_desc: string;
		bulk_cold: string;
		bulk_cold_desc: string;
		divide: string;
		divide_desc: string;
		warmup: string;
		warmup_desc: string;
		final_proof: string;
		final_proof_desc: string;
		ready: string;
		ready_desc: string;
	};
	schedule: {
		heading: string;
		col_when: string;
		col_step: string;
		col_duration: string;
		duration_minutes: string;
		duration_hours: string;
		duration_hours_minutes: string;
	};
	ingredients: {
		heading: string;
		flour: string;
		water: string;
		salt: string;
		fresh_yeast: string;
		sourdough_starter: string;
		fresh_yeast_inline: string;
		sourdough_starter_inline: string;
		total: string;
		preFerment_heading: string;
		preFerment_help: string;
		mainDough_heading: string;
		mainDough_help: string;
		totals_heading: string;
	};
	actions: {
		download_ics: string;
		print: string;
		share: string;
		copied: string;
		share_help: string;
	};
	print: {
		recipe_heading: string;
		source_label: string;
	};
	warnings: {
		too_short: string;
		too_cold: string;
		too_warm: string;
		yeast_tiny: string;
		yeast_large: string;
		night_step: string;
	};
	footer: {
		about: string;
		source: string;
		docs: string;
		support: string;
		license: string;
	};
}

const en: Messages = {
	app: {
		title: 'Knead Time',
		tagline: 'When do you want to bake? Everything works backwards from there.',
		langLabel: 'Language',
		themeLabel: 'Theme',
		theme_auto: 'System theme',
		theme_light: 'Light theme',
		theme_dark: 'Dark theme'
	},
	form: {
		section_when: 'When',
		section_recipe: 'Recipe',
		section_advanced: 'Advanced',
		startAt: 'Start time',
		startAt_help: 'When you begin planning. The schedule runs from here to the bake.',
		startAt_now: 'Now',
		readyBy: 'Ready to bake',
		readyBy_help: 'The moment the first pizza goes in the oven.',
		info_heading: 'Get nerdy: the math behind the schedule',
		info_intro:
			'Fermentation modelled as a kinetic process; the schedule runs backwards from your bake time.',
		info_q10_title: 'Q10 = 2 — rate doubles per +10 °C',
		info_q10_caption: 'Temperature factor (reference 22 °C):',
		info_units_title: 'Fermentation units',
		info_units_body:
			'Each phase contributes hours × f(T) "equivalent-hours-at-22 °C". The sum must reach a target:',
		info_units_fresh: 'Fresh yeast: 1.6 units (≈ 0.2% × 8 h at 22 °C)',
		info_units_sourdough: 'Sourdough starter: 160 units (~100× less active per gram)',
		info_units_solve: 'Yeast percent solves the target:',
		info_switch_title: 'Cold ↔ room switch',
		info_switch_body:
			'Window ≥ 16 h activates a cold-bulk phase at 4 °C (≈ 16× slower than 22 °C). Shorter windows stay at room temperature.',
		info_mass_title: 'Mass balance',
		info_mass_body:
			"Baker's percentages with flour = 100%. Solve for flour from the total dough mass:",
		info_mass_caption_fresh: 'Fresh yeast — new mass added to the budget:',
		info_mass_caption_sourdough:
			'Sourdough — starter is just flour + water from the existing budget:',
		info_night_title: 'Night-window guard',
		info_night_body:
			'No active step is allowed between 22:00 and 08:00. The cold-bulk leg nudges within [12 h, 48 h] to keep mixing and shaping in waking hours.',
		pizzaCount: 'Pizzas',
		ballWeight: 'Ball weight (g)',
		ballWeight_round: 'Round numbers',
		ballWeight_round_help: 'Nudges the ball weight so flour and water land on tidy values.',
		hydration: 'Hydration (%)',
		hydration_help: 'Water as a percentage of flour weight.',
		salt: 'Salt (% of flour)',
		yeastType: 'Yeast',
		yeast_fresh: 'Fresh yeast (cube)',
		yeast_sourdough: 'Sourdough starter',
		starterHydration: 'Starter hydration (%)',
		starterHydration_help: '100% means equal flour and water.',
		roomTemp: 'Room temperature (°C)',
		roomTemp_help: 'Warmer kitchens ferment faster — this drives the math.',
		preFerment: 'Pre-ferment',
		preFerment_none: 'None',
		preFerment_biga: 'Biga (stiff, ~50% hydration)',
		preFerment_poolish: 'Poolish (loose, 100% hydration)',
		preFermentFlour: 'Pre-ferment flour (% of total)'
	},
	mode: {
		cold: 'Cold ferment',
		room: 'Room ferment',
		cold_blurb: 'Long fridge phase — flavour develops while you sleep.',
		room_blurb: 'Everything at room temperature.'
	},
	steps: {
		preferment_mix: 'Mix pre-ferment',
		preferment_mix_desc:
			'Combine {flour} g flour, {water} g water and {yeast} g fresh yeast. Cover and let it mature at room temperature for {duration} (HH:MM) until you mix the main dough.',
		preferment_proof: 'Pre-ferment matures',
		preferment_proof_desc:
			'Let the covered pre-ferment mature undisturbed at room temperature until you mix the main dough.',
		prep: 'Weigh & prep',
		prep_desc:
			'Weigh out {flour} g flour, {water} g water, {salt} g salt and {yeast} g {yeast_label}. Take ingredients out of the fridge.',
		mix: 'Mix dough',
		mix_desc:
			'Combine {flour} g flour, {water} g water, {salt} g salt and {yeast} g {yeast_label}. Knead until smooth.',
		mix_desc_with_preferment:
			'Add the ripe pre-dough to {flour} g flour, {water} g water, {salt} g salt and {yeast} g {yeast_label}. Knead until smooth.',
		bulk_room: 'Bulk ferment (room)',
		bulk_room_desc: 'Cover the dough and let it rise at room temperature.',
		bulk_cold: 'Bulk ferment (fridge)',
		bulk_cold_desc: 'Move the covered dough to the fridge. Long, slow fermentation.',
		divide: 'Divide & ball',
		divide_desc: 'Cut the dough into {n} equal balls of {weight} g each and shape them tight.',
		warmup: 'Warm up balls',
		warmup_desc: 'Leave the balls at room temperature so they finish proofing evenly.',
		final_proof: 'Final proof',
		final_proof_desc: 'Last rest before shaping. Balls should look puffy and relaxed.',
		ready: 'Shape & bake',
		ready_desc: 'Open each ball, top, and into the oven.'
	},
	schedule: {
		heading: 'Schedule',
		col_when: 'When',
		col_step: 'Step',
		col_duration: 'Duration',
		duration_minutes: '{n} min',
		duration_hours: '{n} h',
		duration_hours_minutes: '{h} h {m} min'
	},
	ingredients: {
		heading: 'Ingredients',
		flour: 'Flour',
		water: 'Water',
		salt: 'Salt',
		fresh_yeast: 'Fresh yeast',
		sourdough_starter: 'Sourdough starter',
		fresh_yeast_inline: 'fresh yeast',
		sourdough_starter_inline: 'sourdough starter',
		total: 'Total dough',
		preFerment_heading: 'Pre-dough',
		preFerment_help: 'Mix the day before, leave at room temperature overnight.',
		mainDough_heading: 'Main dough',
		mainDough_help: 'Mix on baking day, together with the ripe pre-dough.',
		totals_heading: 'Totals'
	},
	actions: {
		download_ics: 'Download .ics',
		print: 'Print / Save as PDF',
		share: 'Copy share link',
		copied: 'Copied!',
		share_help: 'The recipe lives in the URL — anyone with the link gets the same dough.'
	},
	print: {
		recipe_heading: 'Recipe',
		source_label: 'Reproduce this recipe at'
	},
	warnings: {
		too_short:
			'Not enough time. Pick a later moment or accept that the dough will be underproofed.',
		too_cold: 'Kitchen looks chilly — fermentation will be sluggish at this temperature.',
		too_warm: 'Kitchen looks hot — dough may overproof. Watch it closely.',
		yeast_tiny: 'Yeast is tiny — measure carefully (a kitchen scale that reads 0.1 g helps).',
		yeast_large: 'Yeast is unusually high — double-check the inputs.',
		night_step:
			'A step still falls between 22:00 and 08:00. Shift the bake time so every task lands during waking hours.'
	},
	footer: {
		about: 'Time-anchored Neapolitan pizza dough calculator.',
		source: 'Source code',
		docs: 'Docs',
		support: 'Support',
		license: '© {year} Jan Welker · Licensed under Apache 2.0'
	}
};

const de: Messages = {
	app: {
		title: 'Knead Time',
		tagline: 'Wann willst du backen? Der Plan ergibt sich rückwärts.',
		langLabel: 'Sprache',
		themeLabel: 'Erscheinungsbild',
		theme_auto: 'Systemeinstellung',
		theme_light: 'Helles Design',
		theme_dark: 'Dunkles Design'
	},
	form: {
		section_when: 'Wann',
		section_recipe: 'Rezept',
		section_advanced: 'Erweitert',
		startAt: 'Startzeit',
		startAt_help: 'Wann du mit dem Planen beginnst. Der Zeitplan läuft von hier bis zum Backen.',
		startAt_now: 'Jetzt',
		readyBy: 'Bereit zum Backen',
		readyBy_help: 'Der Moment, an dem die erste Pizza in den Ofen geht.',
		info_heading: 'Geek-Modus: die Mathematik hinter dem Plan',
		info_intro:
			'Gärung wird als kinetischer Prozess modelliert; der Plan läuft rückwärts von der Backzeit.',
		info_q10_title: 'Q10 = 2 — Rate verdoppelt sich pro +10 °C',
		info_q10_caption: 'Temperaturfaktor (Referenz 22 °C):',
		info_units_title: 'Gärungseinheiten',
		info_units_body:
			'Jede Phase liefert Stunden × f(T) „Äquivalentstunden bei 22 °C". Die Summe muss ein Ziel erreichen:',
		info_units_fresh: 'Frischhefe: 1,6 Einheiten (≈ 0,2% × 8 h bei 22 °C)',
		info_units_sourdough: 'Sauerteig-Anstellgut: 160 Einheiten (~100× weniger aktiv pro Gramm)',
		info_units_solve: 'Hefe-Anteil löst die Zielgleichung:',
		info_switch_title: 'Wechsel Kühlschrank ↔ Raum',
		info_switch_body:
			'Fenster ≥ 16 h aktiviert eine Kühlphase bei 4 °C (≈ 16× langsamer als 22 °C). Kürzere Fenster bleiben bei Raumtemperatur.',
		info_mass_title: 'Massenbilanz',
		info_mass_body: 'Bäckerprozente mit Mehl = 100%. Mehl wird aus der Gesamtmasse aufgelöst:',
		info_mass_caption_fresh: 'Frischhefe — zusätzliche Masse im Budget:',
		info_mass_caption_sourdough:
			'Sauerteig — Anstellgut ist nur Mehl + Wasser aus dem bestehenden Budget:',
		info_night_title: 'Nachtfenster-Schutz',
		info_night_body:
			'Kein aktiver Schritt zwischen 22:00 und 08:00. Die Kühlgare verschiebt sich innerhalb von [12 h, 48 h], damit Kneten und Formen in der Wachzeit liegen.',
		pizzaCount: 'Pizzen',
		ballWeight: 'Teigling (g)',
		ballWeight_round: 'Runde Zahlen',
		ballWeight_round_help:
			'Passt den Teigling so an, dass Mehl und Wasser auf glatten Werten landen.',
		hydration: 'Hydration (%)',
		hydration_help: 'Wasser als Prozentanteil des Mehls.',
		salt: 'Salz (% vom Mehl)',
		yeastType: 'Hefe',
		yeast_fresh: 'Frischhefe (Würfel)',
		yeast_sourdough: 'Sauerteig-Anstellgut',
		starterHydration: 'Hydration Anstellgut (%)',
		starterHydration_help: '100% heißt gleich viel Mehl wie Wasser.',
		roomTemp: 'Raumtemperatur (°C)',
		roomTemp_help: 'Wärmere Küchen sind schneller — das steuert die Rechnung.',
		preFerment: 'Vorteig',
		preFerment_none: 'Keiner',
		preFerment_biga: 'Biga (fest, ~50% Hydration)',
		preFerment_poolish: 'Poolish (flüssig, 100% Hydration)',
		preFermentFlour: 'Vorteig-Mehl (% vom Gesamtmehl)'
	},
	mode: {
		cold: 'Kühlschrank-Gare',
		room: 'Raumtemperatur-Gare',
		cold_blurb: 'Lange Kühlschrankphase — Aroma entwickelt sich über Nacht.',
		room_blurb: 'Alles bei Raumtemperatur.'
	},
	steps: {
		preferment_mix: 'Vorteig ansetzen',
		preferment_mix_desc:
			'{flour} g Mehl, {water} g Wasser und {yeast} g Frischhefe verrühren. Abgedeckt {duration} (HH:MM) bei Raumtemperatur reifen lassen, bis der Hauptteig geknetet wird.',
		preferment_proof: 'Vorteig reift',
		preferment_proof_desc:
			'Den abgedeckten Vorteig ungestört bei Raumtemperatur reifen lassen, bis der Hauptteig geknetet wird.',
		prep: 'Abwiegen & vorbereiten',
		prep_desc:
			'{flour} g Mehl, {water} g Wasser, {salt} g Salz und {yeast} g {yeast_label} abwiegen. Zutaten rechtzeitig aus dem Kühlschrank holen.',
		mix: 'Teig mischen',
		mix_desc:
			'{flour} g Mehl, {water} g Wasser, {salt} g Salz und {yeast} g {yeast_label} vermengen und glatt kneten.',
		mix_desc_with_preferment:
			'Den reifen Vorteig mit {flour} g Mehl, {water} g Wasser, {salt} g Salz und {yeast} g {yeast_label} vermengen und glatt kneten.',
		bulk_room: 'Stockgare (Raum)',
		bulk_room_desc: 'Teig abdecken und bei Raumtemperatur gehen lassen.',
		bulk_cold: 'Stockgare (Kühlschrank)',
		bulk_cold_desc: 'Den abgedeckten Teig in den Kühlschrank stellen — lange, langsame Gare.',
		divide: 'Portionieren',
		divide_desc:
			'Den Teig in {n} gleich große Teiglinge zu je {weight} g teilen und straff rundwirken.',
		warmup: 'Teiglinge akklimatisieren',
		warmup_desc:
			'Teiglinge bei Raumtemperatur ausgleichen lassen, damit sie gleichmäßig nachgehen.',
		final_proof: 'Stückgare',
		final_proof_desc:
			'Letzte Ruhe vor dem Formen. Die Teiglinge sollen aufgegangen und entspannt aussehen.',
		ready: 'Formen & backen',
		ready_desc: 'Teigling öffnen, belegen, in den Ofen.'
	},
	schedule: {
		heading: 'Zeitplan',
		col_when: 'Wann',
		col_step: 'Schritt',
		col_duration: 'Dauer',
		duration_minutes: '{n} Min',
		duration_hours: '{n} Std',
		duration_hours_minutes: '{h} Std {m} Min'
	},
	ingredients: {
		heading: 'Zutaten',
		flour: 'Mehl',
		water: 'Wasser',
		salt: 'Salz',
		fresh_yeast: 'Frischhefe',
		sourdough_starter: 'Sauerteig',
		fresh_yeast_inline: 'Frischhefe',
		sourdough_starter_inline: 'Sauerteig',
		total: 'Gesamtteig',
		preFerment_heading: 'Vorteig',
		preFerment_help: 'Am Vorabend ansetzen, über Nacht bei Raumtemperatur reifen lassen.',
		mainDough_heading: 'Hauptteig',
		mainDough_help: 'Am Backtag zusammen mit dem reifen Vorteig vermengen.',
		totals_heading: 'Gesamt'
	},
	actions: {
		download_ics: '.ics herunterladen',
		print: 'Drucken / als PDF',
		share: 'Link kopieren',
		copied: 'Kopiert!',
		share_help: 'Das Rezept steckt in der URL — wer den Link hat, hat denselben Teig.'
	},
	print: {
		recipe_heading: 'Rezept',
		source_label: 'Rezept reproduzieren unter'
	},
	warnings: {
		too_short:
			'Zu wenig Zeit. Wähle einen späteren Zeitpunkt oder akzeptiere, dass der Teig unfertig sein wird.',
		too_cold: 'Die Küche sieht kühl aus — die Gare wird zäh.',
		too_warm: 'Die Küche sieht warm aus — Achtung Übergare.',
		yeast_tiny: 'Sehr wenig Hefe — Feinwaage (0,1 g) hilft.',
		yeast_large: 'Sehr viel Hefe — kurz die Eingaben prüfen.',
		night_step:
			'Ein Schritt fällt noch zwischen 22:00 und 08:00. Verschiebe die Backzeit, damit alle Aufgaben tagsüber liegen.'
	},
	footer: {
		about: 'Zeit-orientierter Rechner für neapolitanischen Pizzateig.',
		source: 'Quellcode',
		docs: 'Dokumentation',
		support: 'Support',
		license: '© {year} Jan Welker · Lizenziert unter Apache 2.0'
	}
};

const it: Messages = {
	app: {
		title: 'Knead Time',
		tagline: 'Quando vuoi infornare? Tutto si calcola a ritroso.',
		langLabel: 'Lingua',
		themeLabel: 'Tema',
		theme_auto: 'Tema di sistema',
		theme_light: 'Tema chiaro',
		theme_dark: 'Tema scuro'
	},
	form: {
		section_when: 'Quando',
		section_recipe: 'Ricetta',
		section_advanced: 'Avanzate',
		startAt: 'Ora di inizio',
		startAt_help: 'Quando inizi a pianificare. Il programma va da qui alla cottura.',
		startAt_now: 'Adesso',
		readyBy: 'Pronto da infornare',
		readyBy_help: "L'istante in cui la prima pizza entra nel forno.",
		info_heading: 'Modalità nerd: la matematica dietro il programma',
		info_intro:
			"Lievitazione modellata come processo cinetico; il programma scorre a ritroso dall'ora di cottura.",
		info_q10_title: 'Q10 = 2 — la velocità raddoppia ogni +10 °C',
		info_q10_caption: 'Fattore di temperatura (riferimento 22 °C):',
		info_units_title: 'Unità di lievitazione',
		info_units_body:
			'Ogni fase apporta ore × f(T) "ore-equivalenti a 22 °C". La somma deve raggiungere un obiettivo:',
		info_units_fresh: 'Lievito di birra fresco: 1,6 unità (≈ 0,2% × 8 h a 22 °C)',
		info_units_sourdough: 'Lievito madre: 160 unità (~100× meno attivo per grammo)',
		info_units_solve: 'La percentuale di lievito risolve il target:',
		info_switch_title: 'Passaggio frigo ↔ ambiente',
		info_switch_body:
			'Finestra ≥ 16 h attiva una puntata in frigo a 4 °C (≈ 16× più lenta che a 22 °C). Finestre più corte restano a temperatura ambiente.',
		info_mass_title: 'Bilancio di massa',
		info_mass_body:
			'Percentuali del fornaio con farina = 100%. La farina si ricava dalla massa totale:',
		info_mass_caption_fresh: 'Lievito fresco — massa nuova aggiunta al totale:',
		info_mass_caption_sourdough: 'Lievito madre — è solo farina + acqua dal totale esistente:',
		info_night_title: 'Protezione fascia notturna',
		info_night_body:
			'Nessun passo attivo tra le 22:00 e le 08:00. La puntata in frigo si sposta tra [12 h, 48 h] per tenere impasto e staglio nelle ore di veglia.',
		pizzaCount: 'Pizze',
		ballWeight: 'Panetto (g)',
		ballWeight_round: 'Arrotonda',
		ballWeight_round_help: 'Aggiusta il peso del panetto perché farina e acqua siano tondi.',
		hydration: 'Idratazione (%)',
		hydration_help: 'Acqua in percentuale sulla farina.',
		salt: 'Sale (% sulla farina)',
		yeastType: 'Lievito',
		yeast_fresh: 'Lievito di birra fresco',
		yeast_sourdough: 'Lievito madre',
		starterHydration: 'Idratazione lievito madre (%)',
		starterHydration_help: '100% significa stessa quantità di farina e acqua.',
		roomTemp: 'Temperatura ambiente (°C)',
		roomTemp_help: 'In cucine più calde la lievitazione corre — è ciò che guida il calcolo.',
		preFerment: 'Preimpasto',
		preFerment_none: 'Nessuno',
		preFerment_biga: 'Biga (asciutta, ~50% idratazione)',
		preFerment_poolish: 'Poolish (liquido, 100% idratazione)',
		preFermentFlour: 'Farina nel preimpasto (% del totale)'
	},
	mode: {
		cold: 'Maturazione in frigo',
		room: 'Maturazione a temperatura ambiente',
		cold_blurb: 'Lunga fase in frigorifero — il sapore matura lentamente.',
		room_blurb: 'Tutto a temperatura ambiente.'
	},
	steps: {
		preferment_mix: 'Preparare il preimpasto',
		preferment_mix_desc:
			'Mescolare {flour} g di farina, {water} g di acqua e {yeast} g di lievito di birra fresco. Coprire e lasciare maturare a temperatura ambiente per {duration} (HH:MM) fino a quando si impasta il principale.',
		preferment_proof: 'Il preimpasto matura',
		preferment_proof_desc:
			'Lasciare maturare il preimpasto coperto, indisturbato a temperatura ambiente, fino a impastare il principale.',
		prep: 'Pesare e preparare',
		prep_desc:
			'Pesare {flour} g di farina, {water} g di acqua, {salt} g di sale e {yeast} g di {yeast_label}. Togliere gli ingredienti dal frigo.',
		mix: 'Impastare',
		mix_desc:
			'Unire {flour} g di farina, {water} g di acqua, {salt} g di sale e {yeast} g di {yeast_label}. Lavorare fino a impasto liscio.',
		mix_desc_with_preferment:
			'Unire il preimpasto maturo a {flour} g di farina, {water} g di acqua, {salt} g di sale e {yeast} g di {yeast_label}. Lavorare fino a impasto liscio.',
		bulk_room: 'Puntata (ambiente)',
		bulk_room_desc: "Coprire l'impasto e farlo lievitare a temperatura ambiente.",
		bulk_cold: 'Puntata (frigo)',
		bulk_cold_desc: "Spostare l'impasto coperto in frigorifero — lievitazione lunga e lenta.",
		divide: 'Staglio',
		divide_desc: "Dividere l'impasto in {n} panetti da {weight} g e pirlarli stretti.",
		warmup: 'Acclimatare i panetti',
		warmup_desc: 'Lasciare i panetti a temperatura ambiente per uniformare la lievitazione.',
		final_proof: 'Appretto',
		final_proof_desc:
			'Ultimo riposo prima della stesura. I panetti devono essere gonfi e rilassati.',
		ready: 'Stendere e infornare',
		ready_desc: 'Aprire il panetto, condire, in forno.'
	},
	schedule: {
		heading: 'Programma',
		col_when: 'Quando',
		col_step: 'Passo',
		col_duration: 'Durata',
		duration_minutes: '{n} min',
		duration_hours: '{n} h',
		duration_hours_minutes: '{h} h {m} min'
	},
	ingredients: {
		heading: 'Ingredienti',
		flour: 'Farina',
		water: 'Acqua',
		salt: 'Sale',
		fresh_yeast: 'Lievito fresco',
		sourdough_starter: 'Lievito madre',
		fresh_yeast_inline: 'lievito fresco',
		sourdough_starter_inline: 'lievito madre',
		total: 'Impasto totale',
		preFerment_heading: 'Preimpasto',
		preFerment_help: 'Da preparare il giorno prima e lasciar maturare a temperatura ambiente.',
		mainDough_heading: 'Impasto principale',
		mainDough_help: 'Da impastare il giorno della cottura insieme al preimpasto maturo.',
		totals_heading: 'Totale'
	},
	actions: {
		download_ics: 'Scarica .ics',
		print: 'Stampa / Salva PDF',
		share: 'Copia link',
		copied: 'Copiato!',
		share_help: 'La ricetta vive nella URL — chi ha il link ottiene lo stesso impasto.'
	},
	print: {
		recipe_heading: 'Ricetta',
		source_label: 'Riproduci la ricetta su'
	},
	warnings: {
		too_short:
			'Tempo insufficiente. Scegli un orario più tardi o accetta un impasto poco lievitato.',
		too_cold: 'La cucina è fresca — la lievitazione sarà pigra.',
		too_warm: 'La cucina è calda — attenzione alla sovramaturazione.',
		yeast_tiny: 'Lievito minimo — usa una bilancia precisa (0,1 g).',
		yeast_large: 'Quantità di lievito alta — ricontrolla i dati.',
		night_step:
			"Un passaggio cade ancora tra le 22:00 e le 08:00. Sposta l'ora di cottura perché tutte le azioni siano di giorno."
	},
	footer: {
		about: 'Calcolatore per impasto di pizza napoletana ancorato al tempo.',
		source: 'Codice sorgente',
		docs: 'Documentazione',
		support: 'Supporto',
		license: '© {year} Jan Welker · Concesso in licenza con Apache 2.0'
	}
};

const fr: Messages = {
	app: {
		title: 'Knead Time',
		tagline: 'Quand voulez-vous cuire ? Tout se calcule à rebours à partir de là.',
		langLabel: 'Langue',
		themeLabel: 'Thème',
		theme_auto: 'Thème du système',
		theme_light: 'Thème clair',
		theme_dark: 'Thème sombre'
	},
	form: {
		section_when: 'Quand',
		section_recipe: 'Recette',
		section_advanced: 'Avancé',
		startAt: 'Heure de départ',
		startAt_help: "Quand vous commencez à planifier. Le programme va d'ici à la cuisson.",
		startAt_now: 'Maintenant',
		readyBy: 'Prêt à enfourner',
		readyBy_help: 'Le moment où la première pizza entre au four.',
		pizzaCount: 'Pizzas',
		ballWeight: 'Pâton (g)',
		ballWeight_round: 'Arrondir',
		ballWeight_round_help: 'Ajuste le pâton pour que farine et eau tombent sur des valeurs rondes.',
		hydration: 'Hydratation (%)',
		hydration_help: 'Eau en pourcentage de la farine.',
		salt: 'Sel (% de farine)',
		yeastType: 'Levure',
		yeast_fresh: 'Levure fraîche (cube)',
		yeast_sourdough: 'Levain',
		starterHydration: 'Hydratation du levain (%)',
		starterHydration_help: "100% signifie autant de farine que d'eau.",
		roomTemp: 'Température ambiante (°C)',
		roomTemp_help:
			"Les cuisines plus chaudes accélèrent la fermentation — c'est ce qui guide le calcul.",
		preFerment: 'Pré-ferment',
		preFerment_none: 'Aucun',
		preFerment_biga: "Biga (ferme, ~50% d'hydratation)",
		preFerment_poolish: "Poolish (liquide, 100% d'hydratation)",
		preFermentFlour: 'Farine du pré-ferment (% du total)'
	},
	mode: {
		cold: 'Maturation au froid',
		room: 'Maturation à température ambiante',
		cold_blurb: "Longue phase au frigo — l'arôme se développe pendant la nuit.",
		room_blurb: 'Tout à température ambiante.'
	},
	steps: {
		preferment_mix: 'Préparer le pré-ferment',
		preferment_mix_desc:
			"Mélangez {flour} g de farine, {water} g d'eau et {yeast} g de levure fraîche. Couvrez et laissez maturer à température ambiante pendant {duration} (HH:MM) jusqu'au pétrissage de la pâte principale.",
		preferment_proof: 'Le pré-ferment mûrit',
		preferment_proof_desc:
			"Laissez le pré-ferment couvert maturer sans le déranger à température ambiante jusqu'au pétrissage de la pâte principale.",
		prep: 'Peser et préparer',
		prep_desc:
			"Pesez {flour} g de farine, {water} g d'eau, {salt} g de sel et {yeast} g de {yeast_label}. Sortez les ingrédients du frigo.",
		mix: 'Pétrir la pâte',
		mix_desc:
			"Mélangez {flour} g de farine, {water} g d'eau, {salt} g de sel et {yeast} g de {yeast_label}. Pétrissez jusqu'à obtenir une pâte lisse.",
		mix_desc_with_preferment:
			"Ajoutez le pré-ferment mûr à {flour} g de farine, {water} g d'eau, {salt} g de sel et {yeast} g de {yeast_label}. Pétrissez jusqu'à obtenir une pâte lisse.",
		bulk_room: 'Pointage (ambiante)',
		bulk_room_desc: 'Couvrez la pâte et laissez-la lever à température ambiante.',
		bulk_cold: 'Pointage (frigo)',
		bulk_cold_desc: 'Mettez la pâte couverte au frigo — fermentation longue et lente.',
		divide: 'Diviser et bouler',
		divide_desc: 'Coupez la pâte en {n} pâtons égaux de {weight} g chacun et boulez-les serrés.',
		warmup: 'Tempérer les pâtons',
		warmup_desc:
			"Laissez les pâtons à température ambiante pour qu'ils finissent leur apprêt uniformément.",
		final_proof: 'Apprêt',
		final_proof_desc:
			'Dernier repos avant le façonnage. Les pâtons doivent être gonflés et détendus.',
		ready: 'Façonner et enfourner',
		ready_desc: 'Ouvrez chaque pâton, garnissez, au four.'
	},
	schedule: {
		heading: 'Programme',
		col_when: 'Quand',
		col_step: 'Étape',
		col_duration: 'Durée',
		duration_minutes: '{n} min',
		duration_hours: '{n} h',
		duration_hours_minutes: '{h} h {m} min'
	},
	ingredients: {
		heading: 'Ingrédients',
		flour: 'Farine',
		water: 'Eau',
		salt: 'Sel',
		fresh_yeast: 'Levure fraîche',
		sourdough_starter: 'Levain',
		fresh_yeast_inline: 'levure fraîche',
		sourdough_starter_inline: 'levain',
		total: 'Pâte totale',
		preFerment_heading: 'Pré-ferment',
		preFerment_help: 'À préparer la veille, laisser maturer la nuit à température ambiante.',
		mainDough_heading: 'Pâte principale',
		mainDough_help: 'À pétrir le jour de la cuisson, avec le pré-ferment mûr.',
		totals_heading: 'Total'
	},
	actions: {
		download_ics: 'Télécharger .ics',
		print: 'Imprimer / Enregistrer en PDF',
		share: 'Copier le lien',
		copied: 'Copié !',
		share_help: "La recette est dans l'URL — toute personne avec le lien obtient la même pâte."
	},
	print: {
		recipe_heading: 'Recette',
		source_label: 'Reproduire cette recette sur'
	},
	warnings: {
		too_short:
			'Pas assez de temps. Choisissez un moment plus tardif ou acceptez une pâte sous-fermentée.',
		too_cold: 'Cuisine fraîche — la fermentation sera lente à cette température.',
		too_warm: 'Cuisine chaude — la pâte risque la sur-fermentation. Surveillez-la.',
		yeast_tiny: 'Très peu de levure — pesez précisément (une balance au 0,1 g aide).',
		yeast_large: 'Quantité de levure inhabituelle — vérifiez les valeurs.',
		night_step:
			'Une étape tombe encore entre 22:00 et 08:00. Décalez la cuisson pour que toutes les tâches soient en journée.'
	},
	footer: {
		about: 'Calculateur de pâte à pizza napolitaine ancré dans le temps.',
		source: 'Code source',
		docs: 'Documentation',
		support: 'Support',
		license: '© {year} Jan Welker · Sous licence Apache 2.0'
	}
};

const nl: Messages = {
	app: {
		title: 'Knead Time',
		tagline: 'Wanneer wil je bakken? De rest werkt vanaf dat moment terug.',
		langLabel: 'Taal',
		themeLabel: 'Thema',
		theme_auto: 'Systeemthema',
		theme_light: 'Licht thema',
		theme_dark: 'Donker thema'
	},
	form: {
		section_when: 'Wanneer',
		section_recipe: 'Recept',
		section_advanced: 'Geavanceerd',
		startAt: 'Starttijd',
		startAt_help: 'Wanneer je begint te plannen. Het schema loopt van hier tot het bakken.',
		startAt_now: 'Nu',
		readyBy: 'Klaar om te bakken',
		readyBy_help: 'Het moment dat de eerste pizza in de oven gaat.',
		pizzaCount: "Pizza's",
		ballWeight: 'Bolletje (g)',
		ballWeight_round: 'Ronde getallen',
		ballWeight_round_help: 'Past het bolletje aan zodat bloem en water op nette getallen uitkomen.',
		hydration: 'Hydratatie (%)',
		hydration_help: 'Water als percentage van de bloem.',
		salt: 'Zout (% van bloem)',
		yeastType: 'Gist',
		yeast_fresh: 'Verse gist (blokje)',
		yeast_sourdough: 'Zuurdesem',
		starterHydration: 'Desem-hydratatie (%)',
		starterHydration_help: '100% betekent evenveel bloem als water.',
		roomTemp: 'Kamertemperatuur (°C)',
		roomTemp_help: 'Warmere keukens rijzen sneller — dat stuurt de berekening.',
		preFerment: 'Voordeeg',
		preFerment_none: 'Geen',
		preFerment_biga: 'Biga (stevig, ~50% hydratatie)',
		preFerment_poolish: 'Poolish (vloeibaar, 100% hydratatie)',
		preFermentFlour: 'Voordeeg-bloem (% van totaal)'
	},
	mode: {
		cold: 'Koelkast-rijs',
		room: 'Kamertemperatuur-rijs',
		cold_blurb: 'Lange koelkastfase — smaak ontwikkelt zich terwijl je slaapt.',
		room_blurb: 'Alles op kamertemperatuur.'
	},
	steps: {
		preferment_mix: 'Voordeeg mengen',
		preferment_mix_desc:
			'Meng {flour} g bloem, {water} g water en {yeast} g verse gist. Afgedekt {duration} (HH:MM) op kamertemperatuur laten rijpen tot je het hoofddeeg kneedt.',
		preferment_proof: 'Voordeeg rijpt',
		preferment_proof_desc:
			'Laat het afgedekte voordeeg ongestoord rijpen op kamertemperatuur tot je het hoofddeeg kneedt.',
		prep: 'Wegen en klaarzetten',
		prep_desc:
			'Weeg {flour} g bloem, {water} g water, {salt} g zout en {yeast} g {yeast_label} af. Haal de ingrediënten uit de koelkast.',
		mix: 'Deeg kneden',
		mix_desc:
			'Meng {flour} g bloem, {water} g water, {salt} g zout en {yeast} g {yeast_label}. Kneed tot een glad deeg.',
		mix_desc_with_preferment:
			'Voeg het rijpe voordeeg toe aan {flour} g bloem, {water} g water, {salt} g zout en {yeast} g {yeast_label}. Kneed tot een glad deeg.',
		bulk_room: 'Bulkrijs (kamer)',
		bulk_room_desc: 'Dek het deeg af en laat het rijzen op kamertemperatuur.',
		bulk_cold: 'Bulkrijs (koelkast)',
		bulk_cold_desc: 'Zet het afgedekte deeg in de koelkast — lange, langzame rijs.',
		divide: 'Verdelen en bollen',
		divide_desc: 'Verdeel het deeg in {n} gelijke bolletjes van {weight} g en bol ze strak op.',
		warmup: 'Bolletjes laten acclimatiseren',
		warmup_desc: 'Laat de bolletjes op kamertemperatuur zodat ze gelijkmatig narijzen.',
		final_proof: 'Narijs',
		final_proof_desc:
			'Laatste rust voor het uitrekken. De bolletjes horen luchtig en ontspannen te zijn.',
		ready: 'Uitrekken en bakken',
		ready_desc: 'Open elk bolletje, beleg het, en in de oven.'
	},
	schedule: {
		heading: 'Schema',
		col_when: 'Wanneer',
		col_step: 'Stap',
		col_duration: 'Duur',
		duration_minutes: '{n} min',
		duration_hours: '{n} u',
		duration_hours_minutes: '{h} u {m} min'
	},
	ingredients: {
		heading: 'Ingrediënten',
		flour: 'Bloem',
		water: 'Water',
		salt: 'Zout',
		fresh_yeast: 'Verse gist',
		sourdough_starter: 'Zuurdesem',
		fresh_yeast_inline: 'verse gist',
		sourdough_starter_inline: 'zuurdesem',
		total: 'Totaal deeg',
		preFerment_heading: 'Voordeeg',
		preFerment_help: "De dag ervoor mengen, 's nachts op kamertemperatuur laten rijpen.",
		mainDough_heading: 'Hoofddeeg',
		mainDough_help: 'Op de bakdag samen met het rijpe voordeeg kneden.',
		totals_heading: 'Totaal'
	},
	actions: {
		download_ics: '.ics downloaden',
		print: 'Afdrukken / Opslaan als PDF',
		share: 'Deellink kopiëren',
		copied: 'Gekopieerd!',
		share_help: 'Het recept staat in de URL — wie de link heeft, krijgt hetzelfde deeg.'
	},
	print: {
		recipe_heading: 'Recept',
		source_label: 'Reproduceer dit recept op'
	},
	warnings: {
		too_short: 'Niet genoeg tijd. Kies een later moment of accepteer dat het deeg ondergerezen is.',
		too_cold: 'Keuken oogt fris — fermentatie zal traag zijn bij deze temperatuur.',
		too_warm: 'Keuken oogt warm — deeg kan overgaar worden. Houd het in de gaten.',
		yeast_tiny:
			'Heel weinig gist — weeg nauwkeurig (een keukenweegschaal die 0,1 g afleest helpt).',
		yeast_large: 'Ongebruikelijk veel gist — controleer de invoer.',
		night_step:
			'Een stap valt nog tussen 22:00 en 08:00. Schuif de baktijd zodat alle taken overdag vallen.'
	},
	footer: {
		about: 'Tijdgestuurde calculator voor Napolitaans pizzadeeg.',
		source: 'Broncode',
		docs: 'Documentatie',
		support: 'Ondersteuning',
		license: '© {year} Jan Welker · Gelicentieerd onder Apache 2.0'
	}
};

const jam: Messages = {
	app: {
		title: 'Knead Time',
		tagline: 'Wen yu waan bake? Everyting work backward fram dat time deh.',
		langLabel: 'Language',
		themeLabel: 'Look',
		theme_auto: 'Same as di system',
		theme_light: 'Bright look',
		theme_dark: 'Dark look'
	},
	form: {
		section_when: 'Wen',
		section_recipe: 'Recipe',
		section_advanced: 'Mo settings',
		startAt: 'Start time',
		startAt_help: 'Wen yu start plan. Di schedule run fram yah right to wen yu bake.',
		startAt_now: 'Right now',
		readyBy: 'Ready fi bake',
		readyBy_help: 'Di moment di fus pizza go inna di oven.',
		pizzaCount: 'Pizza dem',
		ballWeight: 'Ball weight (g)',
		ballWeight_round: 'Round it off',
		ballWeight_round_help: 'Nudge di ball weight so flour an wata land pon nice round figga.',
		hydration: 'Wata percent (%)',
		hydration_help: 'Wata as a percent a di flour weight.',
		salt: 'Salt (% a flour)',
		yeastType: 'Ris-ting',
		yeast_fresh: 'Fresh ris-ting (cube)',
		yeast_sourdough: 'Sour starta',
		starterHydration: 'Starta wata percent (%)',
		starterHydration_help: '100% mean same amount a flour an wata.',
		roomTemp: 'Room temperature (°C)',
		roomTemp_help: 'Hotta kitchen rise fasta — dat ya wat drive di figga dem.',
		preFerment: 'Befo-dough',
		preFerment_none: 'None',
		preFerment_biga: 'Biga (stiff, ~50% wata)',
		preFerment_poolish: 'Poolish (loose, 100% wata)',
		preFermentFlour: 'Befo-dough flour (% a di total)'
	},
	mode: {
		cold: 'Cold rise',
		room: 'Room rise',
		cold_blurb: 'Long fridge time — di flavour come up while yu a sleep.',
		room_blurb: 'Everyting a sit a room temperature.'
	},
	steps: {
		preferment_mix: 'Mek di befo-dough',
		preferment_mix_desc:
			'Mix up {flour} g flour, {water} g wata an {yeast} g fresh ris-ting. Cova it an mek it sit a room temperature fi {duration} (HH:MM) til yu mek di main dough.',
		preferment_proof: 'Befo-dough a sit',
		preferment_proof_desc:
			'Mek di cova befo-dough sit in peace a room temperature til yu ready fi mek di main dough.',
		prep: 'Weigh an set up',
		prep_desc:
			'Weigh out {flour} g flour, {water} g wata, {salt} g salt an {yeast} g {yeast_label}. Tek di tings dem outta di fridge.',
		mix: 'Knead di dough',
		mix_desc:
			'Mix up {flour} g flour, {water} g wata, {salt} g salt an {yeast} g {yeast_label}. Knead it til smood.',
		mix_desc_with_preferment:
			'Add di ripe befo-dough to {flour} g flour, {water} g wata, {salt} g salt an {yeast} g {yeast_label}. Knead it til smood.',
		bulk_room: 'Big rise (room)',
		bulk_room_desc: 'Cova di dough an mek it rise a room temperature.',
		bulk_cold: 'Big rise (fridge)',
		bulk_cold_desc: 'Carry di cova dough go a fridge — long, slow rise.',
		divide: 'Split an roll up',
		divide_desc: 'Cut up di dough inna {n} same-size ball, {weight} g each, an roll dem up tight.',
		warmup: 'Warm up di ball dem',
		warmup_desc: 'Lef di ball dem a room temperature so dem finish rise even-even.',
		final_proof: 'Las rise',
		final_proof_desc: 'Las res before yu stretch dem. Di ball dem fi look puff up an relax.',
		ready: 'Stretch an bake',
		ready_desc: 'Open up each ball, dash on di topping dem, inna di oven.'
	},
	schedule: {
		heading: 'Schedule',
		col_when: 'Wen',
		col_step: 'Step',
		col_duration: 'How long',
		duration_minutes: '{n} min',
		duration_hours: '{n} hr',
		duration_hours_minutes: '{h} hr {m} min'
	},
	ingredients: {
		heading: 'Tings dem',
		flour: 'Flour',
		water: 'Wata',
		salt: 'Salt',
		fresh_yeast: 'Fresh ris-ting',
		sourdough_starter: 'Sour starta',
		fresh_yeast_inline: 'fresh ris-ting',
		sourdough_starter_inline: 'sour starta',
		total: 'Whole dough',
		preFerment_heading: 'Befo-dough',
		preFerment_help: 'Mek it di day before, lef it a room temperature ova di night.',
		mainDough_heading: 'Main dough',
		mainDough_help: 'Mek it pon baking day, wid di ripe befo-dough.',
		totals_heading: 'All add up'
	},
	actions: {
		download_ics: 'Download .ics',
		print: 'Print / Save as PDF',
		share: 'Copy share link',
		copied: 'Copy!',
		share_help: 'Di recipe live inna di URL — anybody wid di link get di same dough.'
	},
	print: {
		recipe_heading: 'Recipe',
		source_label: 'Mek dis recipe again at'
	},
	warnings: {
		too_short:
			'Nuff time nuh deh deh. Pick a later time or accept seh di dough a go come out underdone.',
		too_cold: 'Kitchen look chilly — di rise a go drag at dis temperature.',
		too_warm: 'Kitchen look hot — di dough might rise too much. Watch it good.',
		yeast_tiny: 'Ris-ting tiny tiny — measure it careful (a scale weh read 0.1 g help out).',
		yeast_large: 'Plenty plenty ris-ting — chek di figga dem again.',
		night_step:
			'A step still a fall between 22:00 an 08:00. Shift di bake time so every task fall inna waking time.'
	},
	footer: {
		about: 'Time-anchor Neapolitan pizza dough calculator.',
		source: 'Source code',
		docs: 'Docs',
		support: 'Support',
		license: '© {year} Jan Welker · Licensed under Apache 2.0'
	}
};

export const MESSAGES: Record<Locale, Messages> = { en, de, it, fr, nl, jam };

// Map our internal locale codes to BCP-47 tags Intl actually knows. CLDR has no
// data for `jam`, so we route Patois through en-JM (12-h time, Latin numerals).
export function intlLocaleTag(locale: Locale): string {
	return locale === 'jam' ? 'en-JM' : locale;
}

export function detectLocale(navigatorLanguages: readonly string[] | undefined): Locale {
	if (!navigatorLanguages) return 'en';
	for (const raw of navigatorLanguages) {
		const lower = raw.toLowerCase();
		const three = lower.slice(0, 3);
		if ((LOCALES as readonly string[]).includes(three)) return three as Locale;
		const two = lower.slice(0, 2);
		if ((LOCALES as readonly string[]).includes(two)) return two as Locale;
	}
	return 'en';
}
