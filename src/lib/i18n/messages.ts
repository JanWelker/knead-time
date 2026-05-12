export const LOCALES = ['en', 'de', 'it'] as const;
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

export const MESSAGES: Record<Locale, Messages> = { en, de, it };

export function detectLocale(navigatorLanguages: readonly string[] | undefined): Locale {
	if (!navigatorLanguages) return 'en';
	for (const raw of navigatorLanguages) {
		const lang = raw.toLowerCase().slice(0, 2);
		if ((LOCALES as readonly string[]).includes(lang)) return lang as Locale;
	}
	return 'en';
}
