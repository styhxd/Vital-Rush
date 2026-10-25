/**
 * Um chefe por viagem. A forma é uma leitura simplificada da morfologia
 * publicada (bastão fusiforme, cadeia de cocos, halo da tinta nanquim,
 * trofozoíto com hemácia, tripanossoma em C, cacho de estafilococos,
 * cordão de bacilos, taquizoíto em crescente, cisticerco com escólex).
 * Não é cópia de foto.
 */

import type { Language, OrganId } from '../types';
import type { BossMutation, BossPlay, BossShape } from './bossArchitect';

type L = Record<Language, string>;

export interface BossSpec {
    id: string;
    from: OrganId;
    to: OrganId;
    shape: BossShape;
    play: BossPlay;
    color: string;
    accent: string;
    hp: number;
    speed: number;
    radius: number;
    short: L;
    disease: L;
    intro: L;
    trick: L;
    lesson: L;
}

const text = (pt: string, en: string, es: string): L => ({ PT: pt, EN: en, ES: es });

export const BOSSES: BossSpec[] = [
    {
        id: 'molar>liver', from: 'molar', to: 'liver', shape: 'spindle', play: 'abscess',
        color: '#f0c2b0', accent: '#c45a48', hp: 1.2, speed: 0.26, radius: 112,
        short: text('F. NUCLEATUM', 'F. NUCLEATUM', 'F. NUCLEATUM'),
        disease: text('Abscesso hepático', 'Liver abscess', 'Absceso hepático'),
        intro: text('Palito da gengiva, pontudo dos dois lados. Desceu e abriu pus no fígado.', 'A stick from the gum, pointed at both ends. It went down and opened pus in the liver.', 'Un palito de la encía, puntiagudo en los dos extremos. Bajó y abrió pus en el hígado.'),
        trick: text('Devagar. Onde ele passa, fica poça. Ficar nela queima.', 'Slow. Where it passes, a puddle stays. Standing in it burns.', 'Despacio. Donde pasa, queda charco. Quedarse quema.'),
        lesson: text(
            'Fusobacterium nucleatum parece um palito, pontudo dos dois lados. Mora na placa do dente. Da boca cai no sangue e, coisa rara, abre abscesso no fígado sem chamar mais ninguém.',
            'Fusobacterium nucleatum looks like a stick, pointed at both ends. It lives in tooth plaque. From the mouth it drops into the blood and, rare thing, opens a liver abscess without calling anyone else.',
            'Fusobacterium nucleatum parece un palito, puntiagudo en los dos extremos. Vive en la placa del diente. De la boca cae a la sangre y, cosa rara, abre un absceso en el hígado sin llamar a nadie más.',
        ),
    },
    {
        id: 'molar>heart', from: 'molar', to: 'heart', shape: 'chain', play: 'embolus',
        color: '#7ddec8', accent: '#1c6b62', hp: 1, speed: 0.4, radius: 100,
        short: text('S. SANGUINIS', 'S. SANGUINIS', 'S. SANGUINIS'),
        disease: text('Endocardite', 'Endocarditis', 'Endocarditis'),
        intro: text('Fila de cocos da boca. Achou a válvula machucada e sentou.', 'A line of cocci from the mouth. It found the hurt valve and sat down.', 'Fila de cocos de la boca. Encontró la válvula lastimada y se sentó.'),
        trick: text('Parte pra cima de você. No tranco, espalha cocos.', 'It comes at you. On the jerk, it scatters cocci.', 'Se te viene encima. En el tirón, esparce cocos.'),
        lesson: text(
            'Streptococcus sanguinis vive em fila, na boca. Uma gengiva que sangra joga essa fila no sangue. Se a válvula já está machucada, a bactéria gruda na fibrina e cresce ali. O nome disso é endocardite.',
            'Streptococcus sanguinis lives in a line, in the mouth. A gum that bleeds throws that line into the blood. If the valve is already hurt, the bacterium sticks to the fibrin and grows there. The name for that is endocarditis.',
            'Streptococcus sanguinis vive en fila, en la boca. Una encía que sangra tira esa fila a la sangre. Si la válvula ya está lastimada, la bacteria se pega a la fibrina y crece ahí. El nombre de eso es endocarditis.',
        ),
    },
    {
        id: 'molar>lung', from: 'molar', to: 'lung', shape: 'filament', play: 'filament',
        color: '#e6c15a', accent: '#8a5a12', hp: 1.35, speed: 0.2, radius: 118,
        short: text('A. ISRAELII', 'A. ISRAELII', 'A. ISRAELII'),
        disease: text('Actinomicose', 'Actinomycosis', 'Actinomicosis'),
        intro: text('Grão amarelo da boca, aspirado. Parou no pulmão.', 'A yellow grain from the mouth, inhaled. It stopped in the lung.', 'Grano amarillo de la boca, aspirado. Paró en el pulmón.'),
        trick: text('Quase não corre. Solta grão amarelo. O chão queima.', 'It barely runs. It drops a yellow grain. The floor burns.', 'Casi no corre. Suelta un grano amarillo. El suelo quema.'),
        lesson: text(
            'Actinomyces israelii engana. Parece fungo, é bactéria. Os filamentos se amarram num grão amarelo, o grânulo de enxofre. Mora na boca. Quando a secreção desce com o ar, esse grão abre actinomicose no pulmão.',
            'Actinomyces israelii fools you. It looks like a fungus and is a bacterium. The filaments tie into a yellow grain, the sulfur granule. It lives in the mouth. When the secretion goes down with the air, that grain opens actinomycosis in the lung.',
            'Actinomyces israelii engaña. Parece hongo y es bacteria. Los filamentos se atan en un grano amarillo, el gránulo de azufre. Vive en la boca. Cuando la secreción baja con el aire, ese grano abre actinomicosis en el pulmón.',
        ),
    },
    {
        id: 'molar>brain', from: 'molar', to: 'brain', shape: 'cluster', play: 'cluster',
        color: '#ff8f6b', accent: '#a33b2a', hp: 0.95, speed: 0.34, radius: 100,
        short: text('S. ANGINOSUS', 'S. ANGINOSUS', 'S. ANGINOSUS'),
        disease: text('Abscesso cerebral', 'Brain abscess', 'Absceso cerebral'),
        intro: text('Cocos miúdos, viciados em abscesso. Subiram do molar e começaram outro no cérebro.', 'Tiny cocci, hooked on abscesses. They climbed from the molar and started another in the brain.', 'Cocos chicos, enganchados al absceso. Subieron del molar y empezaron otro en el cerebro.'),
        trick: text('Leque largo de sementes. Cada uma dói um pouco.', 'A wide fan of seeds. Each one hurts a little.', 'Abanico ancho de semillas. Cada una duele un poco.'),
        lesson: text(
            'Streptococcus anginosus, do grupo milleri, é pequeno e viciado em abscesso. Um foco no molar sobe pela veia da face, ou pelo sangue, e funda outro lá dentro do cérebro. O que ele faz bem é começar de novo, longe.',
            'Streptococcus anginosus, of the milleri group, is small and hooked on abscesses. A focus in the molar climbs the facial vein, or the blood, and starts another one inside the brain. What it does well is begin again, far away.',
            'Streptococcus anginosus, del grupo milleri, es chico y enganchado al absceso. Un foco en el molar sube por la vena de la cara, o por la sangre, y funda otro dentro del cerebro. Lo que hace bien es empezar de nuevo, lejos.',
        ),
    },
    {
        id: 'liver>molar', from: 'liver', to: 'molar', shape: 'yeast', play: 'bud',
        color: '#f2efe6', accent: '#c9b89a', hp: 1.05, speed: 0.36, radius: 96,
        short: text('C. ALBICANS', 'C. ALBICANS', 'C. ALBICANS'),
        disease: text('Sapinho', 'Thrush', 'Muguet'),
        intro: text('Fígado cansado. O fungo da boca cobriu a gengiva.', 'A tired liver. The mouth’s fungus covered the gum.', 'Hígado cansado. El hongo de la boca cubrió la encía.'),
        trick: text('Na metade da vida ele se parte, acelera e solta um broto.', 'At half health it splits, speeds up, and throws a bud.', 'A la mitad de la vida se parte, acelera y suelta un brote.'),
        lesson: text(
            'Candida albicans já mora na boca. A célula é oval e solta um broto. Quando invade, as células entram em fila: isso é uma pseudohifa. Sem o fígado segurando a defesa, o branco toma a gengiva. Sapinho.',
            'Candida albicans already lives in the mouth. The cell is oval and throws a bud. When it invades, the cells line up: that is a pseudohypha. Without the liver holding the defense, white takes the gum. Thrush.',
            'Candida albicans ya vive en la boca. La célula es ovalada y suelta un brote. Cuando invade, las células se ponen en fila: eso es una pseudohifa. Sin el hígado aguantando la defensa, el blanco toma la encía. Muguet.',
        ),
    },
    {
        id: 'liver>heart', from: 'liver', to: 'heart', shape: 'trypo', play: 'flagellum',
        color: '#d7e07a', accent: '#6a7420', hp: 0.9, speed: 0.42, radius: 100,
        short: text('T. CRUZI', 'T. CRUZI', 'T. CRUZI'),
        disease: text('Doença de Chagas', 'Chagas disease', 'Enfermedad de Chagas'),
        intro: text('O tripanossoma largou o fígado e entrou no músculo do coração.', 'The trypanosome left the liver and went into the heart muscle.', 'El tripanosoma dejó el hígado y entró en el músculo del corazón.'),
        trick: text('Não vai reto. O flagelo faz onda e ele corta de lado. Na metade da vida, o corte estala.', 'It will not go straight. The flagellum waves and it cuts sideways. At half health, the cut snaps.', 'No va recto. El flagelo hace onda y corta de lado. A la mitad de la vida, el corte estalla.'),
        lesson: text(
            'No sangue, o Trypanosoma cruzi é uma curva em C, com um ponto escuro atrás, o cinetoplasto, e uma membrana que ondula até o flagelo. Na fase aguda o fígado incha. O ninho de verdade, dentro da célula, é o músculo do coração.',
            'In the blood, Trypanosoma cruzi is a C, with a dark dot behind it, the kinetoplast, and a membrane that waves out to the flagellum. In the acute phase the liver swells. The real nest, inside the cell, is the heart muscle.',
            'En la sangre, Trypanosoma cruzi es una curva en C, con un punto oscuro atrás, el cinetoplasto, y una membrana que ondula hasta el flagelo. En la fase aguda el hígado se hincha. El nido de verdad, dentro de la célula, es el músculo del corazón.',
        ),
    },
    {
        id: 'liver>lung', from: 'liver', to: 'lung', shape: 'amoeba', play: 'pseudopod',
        color: '#c46a5a', accent: '#6e2218', hp: 1.15, speed: 0.22, radius: 120,
        short: text('E. HISTOLYTICA', 'E. HISTOLYTICA', 'E. HISTOLYTICA'),
        disease: text('Amebíase pleuropulmonar', 'Pleuropulmonary amebiasis', 'Amebiasis pleuropulmonar'),
        intro: text('O abscesso do fígado furou o diafragma e caiu no pulmão.', 'The liver abscess punched the diaphragm and fell into the lung.', 'El absceso del hígado perforó el diafragma y cayó al pulmón.'),
        trick: text('Para, avisa, e dá o bote. O rastro fica no chão.', 'It stops, warns, and lunges. The trail stays on the floor.', 'Para, avisa y da el salto. El rastro queda en el suelo.'),
        lesson: text(
            'Entamoeba histolytica, quando está comendo, não tem forma fixa. Núcleo redondo, e muitas vezes uma hemácia inteira lá dentro. O abscesso que ela cava no fígado pode romper o diafragma. O pus desce. Pleura e pulmão são a sala de baixo.',
            'Entamoeba histolytica, when it is eating, has no fixed shape. A round nucleus, and often a whole red cell inside. The abscess it digs in the liver can rupture the diaphragm. The pus goes down. Pleura and lung are the room below.',
            'Entamoeba histolytica, cuando está comiendo, no tiene forma fija. Núcleo redondo, y muchas veces un glóbulo rojo entero adentro. El absceso que cava en el hígado puede romper el diafragma. El pus baja. Pleura y pulmón son la sala de abajo.',
        ),
    },
    {
        id: 'liver>brain', from: 'liver', to: 'brain', shape: 'capsuleRod', play: 'capsule',
        color: '#f2d2dc', accent: '#e7eef8', hp: 1.5, speed: 0.18, radius: 128,
        short: text('K. PNEUMONIAE', 'K. PNEUMONIAE', 'K. PNEUMONIAE'),
        disease: text('Abscesso metastático', 'Metastatic abscess', 'Absceso metastásico'),
        intro: text('Bastão gordo, cápsula de muco. Saiu do fígado e fundou outro foco no cérebro.', 'A fat rod, mucus for a capsule. It left the liver and started another focus in the brain.', 'Bastón gordo, cápsula de moco. Salió del hígado y fundó otro foco en el cerebro.'),
        trick: text('A cápsula aguenta pancada. De vez em quando, um anel de tiros lentos.', 'The capsule takes a beating. Now and then, a ring of slow shots.', 'La cápsula aguanta el golpe. De vez en cuando, un anillo de tiros lentos.'),
        lesson: text(
            'Klebsiella pneumoniae hipervirulenta é um bastão gordo, enrolado num muco tão grosso que no laboratório a colônia estica num fio. O quadro clássico começa com abscesso no fígado e manda metástase infecciosa pro cérebro.',
            'Hypervirulent Klebsiella pneumoniae is a fat rod, wrapped in mucus so thick the lab can stretch the colony into a string. The classic picture starts with a liver abscess and sends an infectious metastasis to the brain.',
            'Klebsiella pneumoniae hipervirulenta es un bastón gordo, envuelto en un moco tan grueso que en el laboratorio la colonia se estira en un hilo. El cuadro clásico empieza con absceso en el hígado y manda una metástasis infecciosa al cerebro.',
        ),
    },
    {
        id: 'heart>molar', from: 'heart', to: 'molar', shape: 'shortRod', play: 'adhere',
        color: '#d9a441', accent: '#6e4a12', hp: 1.05, speed: 0.36, radius: 92,
        short: text('A. ACTINOMYCETEMCOMITANS', 'A. ACTINOMYCETEMCOMITANS', 'A. ACTINOMYCETEMCOMITANS'),
        disease: text('Volta à gengiva', 'Back to the gum', 'Vuelta a la encía'),
        intro: text('O bastão da válvula voltou pro bolso do dente. Casa velha.', 'The rod from the valve went back to the tooth pocket. Old home.', 'El bastón de la válvula volvió al bolsillo del diente. Casa vieja.'),
        trick: text('Gruda. Chegou perto, o contato já é o ataque. Quase não atira.', 'It sticks. Get close and contact is already the attack. It barely shoots.', 'Se pega. Si te acercas, el contacto ya es el ataque. Casi no dispara.'),
        lesson: text(
            'Aggregatibacter actinomycetemcomitans é um bastão curto da gengiva doente. Também é um dos HACEK, o grupo que senta em válvula. A bacteremia da endocardite devolve esse bastão ao bolso periodontal. A volta é ele indo pra casa.',
            'Aggregatibacter actinomycetemcomitans is a short rod from a sick gum. It is also one of the HACEK, the group that sits on a valve. Endocarditis bacteremia sends that rod back to the periodontal pocket. The return trip is it going home.',
            'Aggregatibacter actinomycetemcomitans es un bastón corto de la encía enferma. También es uno de los HACEK, el grupo que se sienta en la válvula. La bacteremia de la endocarditis devuelve ese bastón al bolsillo periodontal. La vuelta es él yendo a casa.',
        ),
    },
    {
        id: 'heart>liver', from: 'heart', to: 'liver', shape: 'capsid', play: 'capsid',
        color: '#9fd7ff', accent: '#d6ecff', hp: 0.72, speed: 0.36, radius: 78,
        short: text('COXSACKIE B', 'COXSACKIE B', 'COXSACKIE B'),
        disease: text('Miocardite e hepatite', 'Myocarditis and hepatitis', 'Miocarditis y hepatitis'),
        intro: text('O vírus do músculo cardíaco seguiu no sangue e inflamou o fígado.', 'The heart-muscle virus stayed in the blood and inflamed the liver.', 'El virus del músculo cardíaco siguió en la sangre e inflamó el hígado.'),
        trick: text('Pequeno, rápido, e cospe tiros curtos, um atrás do outro.', 'Small, fast, and it spits short shots, one after another.', 'Chico, rápido, y escupe tiros cortos, uno detrás del otro.'),
        lesson: text(
            'Coxsackievírus B é um enterovírus. Por fora, uma caixa de vinte faces, sem envelope. O órgão que ele mais maltrata é o coração: miocardite. Circulando, inflama o fígado. Essa hepatite é a próxima sala.',
            'Coxsackievirus B is an enterovirus. Outside, a box of twenty faces, no envelope. The organ it hurts most is the heart: myocarditis. Circulating, it inflames the liver. That hepatitis is the next room.',
            'Coxsackievirus B es un enterovirus. Por fuera, una caja de veinte caras, sin envoltura. El órgano que más maltrata es el corazón: miocarditis. Circulando, inflama el hígado. Esa hepatitis es la sala siguiente.',
        ),
    },
    {
        id: 'heart>lung', from: 'heart', to: 'lung', shape: 'rod', play: 'abscess',
        color: '#5dcaa8', accent: '#1f8a62', hp: 1.1, speed: 0.32, radius: 108,
        short: text('P. AERUGINOSA', 'P. AERUGINOSA', 'P. AERUGINOSA'),
        disease: text('Êmbolo pulmonar', 'Pulmonary embolus', 'Émbolo pulmonar'),
        intro: text('O que crescia na direita do coração viajou e pintou o pulmão de verde.', 'What was growing on the right of the heart traveled and painted the lung green.', 'Lo que crecía a la derecha del corazón viajó y pintó el pulmón de verde.'),
        trick: text('Poça verde no chão. Ficar em cima come a vida.', 'A green puddle on the floor. Standing on it eats health.', 'Charco verde en el suelo. Quedarse encima come la vida.'),
        lesson: text(
            'Pseudomonas aeruginosa fabrica piocianina. É o pigmento que deixa a cultura verde. Uma vegetação na válvula direita solta pedaços na artéria pulmonar. O pulmão filtra isso primeiro, e o bastão gosta do úmido que acha lá.',
            'Pseudomonas aeruginosa makes pyocyanin. That is the pigment that turns a culture green. A vegetation on the right valve throws pieces into the pulmonary artery. The lung filters that first, and the rod likes the wet it finds there.',
            'Pseudomonas aeruginosa fabrica piocianina. Es el pigmento que deja el cultivo verde. Una vegetación en la válvula derecha suelta pedazos en la arteria pulmonar. El pulmón filtra eso primero, y el bastón gusta de lo húmedo que encuentra ahí.',
        ),
    },
    {
        id: 'heart>brain', from: 'heart', to: 'brain', shape: 'grapes', play: 'embolus',
        color: '#f0c24a', accent: '#c9842a', hp: 1.05, speed: 0.38, radius: 110,
        short: text('S. AUREUS', 'S. AUREUS', 'S. AUREUS'),
        disease: text('Êmbolo séptico', 'Septic embolus', 'Émbolo séptico'),
        intro: text('Cachos dourados saíram da válvula e subiram até o cérebro.', 'Gold clusters left the valve and climbed to the brain.', 'Racimos dorados salieron de la válvula y subieron hasta el cerebro.'),
        trick: text('O tranco é um êmbolo: ele avança e espalha cocos.', 'The jerk is an embolus: it surges and scatters cocci.', 'El tirón es un émbolo: avanza y esparce cocos.'),
        lesson: text(
            'Staphylococcus aureus se junta como cacho de uva. Aureus é o dourado da colônia. Na endocardite do lado esquerdo, pedaços da vegetação sobem pelas carótidas. Cada pedaço é um êmbolo séptico. O cérebro é onde ele para.',
            'Staphylococcus aureus clumps like a bunch of grapes. Aureus is the gold of the colony. In left-sided endocarditis, pieces of the vegetation climb the carotids. Each piece is a septic embolus. The brain is where it stops.',
            'Staphylococcus aureus se junta como un racimo de uvas. Aureus es el dorado de la colonia. En la endocarditis del lado izquierdo, pedazos de la vegetación suben por las carótidas. Cada pedazo es un émbolo séptico. El cerebro es donde se detiene.',
        ),
    },
    {
        id: 'lung>molar', from: 'lung', to: 'molar', shape: 'broadBud', play: 'bud',
        color: '#e7d7c4', accent: '#8d6a48', hp: 1.1, speed: 0.3, radius: 104,
        short: text('B. DERMATITIDIS', 'B. DERMATITIDIS', 'B. DERMATITIDIS'),
        disease: text('Blastomicose', 'Blastomycosis', 'Blastomicosis'),
        intro: text('O fungo do pulmão se espalhou e abriu ferida na boca.', 'The lung fungus spread and opened a wound in the mouth.', 'El hongo del pulmón se esparció y abrió una herida en la boca.'),
        trick: text('Parede grossa. Quando racha, o broto largo sai e ele acelera.', 'A thick wall. When it cracks, the wide bud comes off and it speeds up.', 'Pared gruesa. Cuando se raja, el brote ancho sale y acelera.'),
        lesson: text(
            'Blastomyces dermatitidis, no tecido, é uma levedura de parede grossa com broto de base larga. O broto largo separa ele do Cryptococcus, que solta broto estreito. A porta é o pulmão. Disseminado, abre úlcera na boca.',
            'Blastomyces dermatitidis, in tissue, is a thick-walled yeast with a broad-based bud. The wide bud separates it from Cryptococcus, which throws a narrow bud. The door is the lung. Spread out, it opens an ulcer in the mouth.',
            'Blastomyces dermatitidis, en el tejido, es una levadura de pared gruesa con brote de base ancha. El brote ancho lo separa del Cryptococcus, que suelta un brote estrecho. La puerta es el pulmón. Diseminado, abre una úlcera en la boca.',
        ),
    },
    {
        id: 'lung>liver', from: 'lung', to: 'liver', shape: 'schisto', play: 'flagellum',
        color: '#c98b6a', accent: '#6a3030', hp: 0.95, speed: 0.42, radius: 114,
        short: text('S. MANSONI', 'S. MANSONI', 'S. MANSONI'),
        disease: text('Esquistossomose', 'Schistosomiasis', 'Esquistosomiasis'),
        intro: text('O verme jovem atravessou o pulmão. O destino dele é o fígado.', 'The young worm crossed the lung. Its destination is the liver.', 'El gusano joven cruzó el pulmón. Su destino es el hígado.'),
        trick: text('Nada em S, com as ventosas. Não mira em linha reta. Na metade da vida, o corte estala.', 'It swims in an S, suckers and all. It does not aim straight. At half health, the cut snaps.', 'Nada en S, con las ventosas. No apunta en línea recta. A la mitad de la vida, el corte estalla.'),
        lesson: text(
            'Schistosoma mansoni entra pela pele, vira esquistossômulo e tem que passar pelo pulmão. O endereço final é a veia da porta, encostado no fígado, onde o adulto solta os ovos. No desenho: corpo de verme, duas ventosas, e uma cauda que ainda lembra a cercária.',
            'Schistosoma mansoni enters through the skin, becomes a schistosomulum, and has to pass the lung. The last address is the portal vein, against the liver, where the adult sheds eggs. In the drawing: a worm body, two suckers, and a tail that still remembers the cercaria.',
            'Schistosoma mansoni entra por la piel, se vuelve esquistosómulo y tiene que pasar por el pulmón. La dirección final es la vena porta, contra el hígado, donde el adulto suelta los huevos. En el dibujo: cuerpo de gusano, dos ventosas, y una cola que todavía recuerda a la cercaria.',
        ),
    },
    {
        id: 'lung>heart', from: 'lung', to: 'heart', shape: 'cords', play: 'cord',
        color: '#e7d2a8', accent: '#8a7040', hp: 1.4, speed: 0.36, radius: 116,
        short: text('M. TUBERCULOSIS', 'M. TUBERCULOSIS', 'M. TUBERCULOSIS'),
        disease: text('Pericardite', 'Pericarditis', 'Pericarditis'),
        intro: text('Os cordões do pulmão encostaram no pericárdio e apertaram o coração.', 'The cords from the lung reached the pericardium and squeezed the heart.', 'Los cordones del pulmón llegaron al pericardio y apretaron el corazón.'),
        trick: text('Gira no próprio eixo e varre em volta. Perto demais, o cordão pega.', 'It spins on its axis and sweeps around. Too close, and the cord catches you.', 'Gira sobre su eje y barre alrededor. Demasiado cerca, el cordón te agarra.'),
        lesson: text(
            'Mycobacterium tuberculosis é um bastão fino. Um lipídio da parede faz ele crescer em cordão, que nem cobra. Do pulmão a infecção desce por continuidade até o pericárdio. A pericardite tuberculosa aperta o coração por fora.',
            'Mycobacterium tuberculosis is a thin rod. A lipid in the wall makes it grow in a cord, like a snake. From the lung the infection walks by continuity to the pericardium. Tuberculous pericarditis squeezes the heart from the outside.',
            'Mycobacterium tuberculosis es un bastón fino. Un lípido de la pared lo hace crecer en cordón, como una serpiente. Del pulmón la infección baja por continuidad hasta el pericardio. La pericarditis tuberculosa aprieta el corazón desde afuera.',
        ),
    },
    {
        id: 'lung>brain', from: 'lung', to: 'brain', shape: 'halo', play: 'capsule',
        color: '#f4f0ff', accent: '#c9b6ff', hp: 1.6, speed: 0.16, radius: 136,
        short: text('C. NEOFORMANS', 'C. NEOFORMANS', 'C. NEOFORMANS'),
        disease: text('Criptococose', 'Cryptococcosis', 'Criptococosis'),
        intro: text('Levedura do ar entrou no pulmão. A cápsula subiu até a meninge.', 'Yeast from the air entered the lung. The capsule climbed to the meninges.', 'Levadura del aire entró al pulmón. La cápsula subió hasta la meninge.'),
        trick: text('O halo é a cápsula. Aguenta muito e, às vezes, solta um anel.', 'The halo is the capsule. It soaks a lot and, sometimes, sheds a ring.', 'El halo es la cápsula. Aguanta mucho y, a veces, suelta un anillo.'),
        lesson: text(
            'Cryptococcus neoformans entra com a respiração. No pulmão é levedura. Na tinta nanquim do liquor aparece um halo claro: a cápsula de polissacarídeo não deixa a tinta entrar. O broto é estreito. O passo famoso, depois do pulmão, é a meninge.',
            'Cryptococcus neoformans comes in with the breath. In the lung it is a yeast. In the India ink of spinal fluid a clear halo shows up: the polysaccharide capsule will not let the ink in. The bud is narrow. The famous step, after the lung, is the meninges.',
            'Cryptococcus neoformans entra con la respiración. En el pulmón es levadura. En la tinta china del líquido aparece un halo claro: la cápsula de polisacárido no deja entrar la tinta. El brote es estrecho. El paso famoso, después del pulmón, es la meninge.',
        ),
    },
    {
        id: 'brain>molar', from: 'brain', to: 'molar', shape: 'envelope', play: 'reactivate',
        color: '#ffb7c8', accent: '#ffd6e4', hp: 0.9, speed: 0.3, radius: 96,
        short: text('HSV-1', 'HSV-1', 'HSV-1'),
        disease: text('Herpes labial', 'Cold sore', 'Herpes labial'),
        intro: text('O vírus dormia no gânglio. Desceu o nervo e acordou na boca.', 'The virus was asleep in the ganglion. It walked the nerve down and woke in the mouth.', 'El virus dormía en el ganglio. Bajó el nervio y despertó en la boca.'),
        trick: text('Fica quieto, junta, e solta um anel de uma vez. Reativou.', 'It stays quiet, gathers, and throws a ring all at once. It reactivated.', 'Se queda quieto, junta, y suelta un anillo de una vez. Se reactivó.'),
        lesson: text(
            'HSV-1 entra pela boca e sobe o nervo até o gânglio do trigêmeo. Fica quieto a vida inteira. Quando acorda, desce o mesmo nervo e reabre a ferida no lábio ou na gengiva. Por dentro a cápsula é geométrica. Por fora, um envelope mole.',
            'HSV-1 enters by the mouth and climbs the nerve to the trigeminal ganglion. It stays quiet for a whole life. When it wakes, it walks the same nerve down and reopens the sore on the lip or the gum. Inside, the shell is geometric. Outside, a soft envelope.',
            'HSV-1 entra por la boca y sube el nervio hasta el ganglio del trigémino. Se queda quieto toda la vida. Cuando despierta, baja el mismo nervio y reabre la herida en el labio o la encía. Por dentro la cápsula es geométrica. Por fuera, una envoltura blanda.',
        ),
    },
    {
        id: 'brain>liver', from: 'brain', to: 'liver', shape: 'cyst', play: 'cyst',
        color: '#d5efe8', accent: '#f2fff8', hp: 1.45, speed: 0.2, radius: 124,
        short: text('T. SOLIUM', 'T. SOLIUM', 'T. SOLIUM'),
        disease: text('Cisticercose', 'Cysticercosis', 'Cisticercosis'),
        intro: text('Bolha com a cabeça do verme dentro. Estava no cérebro. O fígado entrou na lista.', 'A blister with the worm’s head inside. It was in the brain. The liver joined the list.', 'Burbuja con la cabeza del gusano adentro. Estaba en el cerebro. El hígado entró en la lista.'),
        trick: text('A vesícula aguenta. Quando rompe, o escólex sai correndo.', 'The bladder soaks hits. When it breaks, the scolex runs out.', 'La vesícula aguanta. Cuando se rompe, el escólex sale corriendo.'),
        lesson: text(
            'Taenia solium, no tecido, vira cisticerco: uma bolha d\'água com a cabeça do verme dentro, o escólex, cheio de gancho. O endereço clássico é o cérebro, a neurocisticercose. Se os cistos se espalham, o fígado entra na lista. Quieto, é bolha. Aberto, é uma cabeça.',
            'Taenia solium, in tissue, becomes a cysticercus: a water blister with the worm’s head inside, the scolex, hooks and all. The classic address is the brain, neurocysticercosis. If the cysts scatter, the liver joins the list. Quiet, it is a blister. Open, it is a head.',
            'Taenia solium, en el tejido, se vuelve cisticerco: una burbuja de agua con la cabeza del gusano adentro, el escólex, lleno de ganchos. La dirección clásica es el cerebro, la neurocisticercosis. Si los quistes se esparcen, el hígado entra en la lista. Quieto, es burbuja. Abierto, es una cabeza.',
        ),
    },
    {
        id: 'brain>heart', from: 'brain', to: 'heart', shape: 'crescent', play: 'crescent',
        color: '#b7e0ff', accent: '#4a7ea8', hp: 1, speed: 0.5, radius: 90,
        short: text('T. GONDII', 'T. GONDII', 'T. GONDII'),
        disease: text('Toxoplasmose', 'Toxoplasmosis', 'Toxoplasmosis'),
        intro: text('O crescente saiu do cisto no cérebro e invadiu o músculo do coração.', 'The crescent left the cyst in the brain and invaded the heart muscle.', 'El creciente salió del quiste en el cerebro e invadió el músculo del corazón.'),
        trick: text('Caça de lado. O bote escorrega e solta taquizoítos. Na metade da vida o cisto rompe, e ele não para.', 'It hunts on a slant. The lunge slips and sheds tachyzoites. At half health the cyst breaks, and it does not stop.', 'Caza de lado. El salto se escurre y suelta taquizoítos. A la mitad de la vida el quiste se rompe, y no para.'),
        lesson: text(
            'Toxoplasma gondii, na hora de invadir, tem forma de crescente. O nome vem de toxon, que é arco. O cisto quieto mora no cérebro. Quando rompe, os taquizoítos caem no sangue, e um músculo que eles ocupam é o coração.',
            'Toxoplasma gondii, when it invades, is shaped like a crescent. The name comes from toxon, a bow. The quiet cyst lives in the brain. When it breaks, the tachyzoites fall into the blood, and one muscle they occupy is the heart.',
            'Toxoplasma gondii, a la hora de invadir, tiene forma de creciente. El nombre viene de toxon, que es arco. El quiste quieto vive en el cerebro. Cuando se rompe, los taquizoítos caen a la sangre, y un músculo que ocupan es el corazón.',
        ),
    },
    {
        id: 'brain>lung', from: 'brain', to: 'lung', shape: 'coil', play: 'coil',
        color: '#e0b48a', accent: '#8a5a32', hp: 1.1, speed: 0.36, radius: 108,
        short: text('A. CANTONENSIS', 'A. CANTONENSIS', 'A. CANTONENSIS'),
        disease: text('Angiostrongilíase', 'Angiostrongyliasis', 'Angiostrongiliasis'),
        intro: text('A larva se perdeu no cérebro. O endereço dela é o pulmão do rato.', 'The larva got lost in the brain. Its address is the rat’s lung.', 'La larva se perdió en el cerebro. Su dirección es el pulmón de la rata.'),
        trick: text('Enrolou em você. O círculo aperta, afrouxa, aperta.', 'It coiled around you. The circle tightens, loosens, tightens.', 'Se enrolló en ti. El círculo aprieta, afloja, aprieta.'),
        lesson: text(
            'Angiostrongylus cantonensis é o verme do pulmão do rato. O adulto mora na artéria pulmonar. Na pessoa, a larva erra o caminho e sobe ao cérebro: meningite eosinofílica. Nesta viagem, a sala seguinte é o endereço de onde ele veio.',
            'Angiostrongylus cantonensis is the rat lungworm. The adult lives in the pulmonary artery. In a person, the larva misses the turn and climbs to the brain: eosinophilic meningitis. On this trip, the next room is the address it came from.',
            'Angiostrongylus cantonensis es el gusano del pulmón de la rata. El adulto vive en la arteria pulmonar. En la persona, la larva se equivoca de camino y sube al cerebro: meningitis eosinofílica. En este viaje, la sala siguiente es la dirección de donde vino.',
        ),
    },
];

const BY_ID = new Map(BOSSES.map((b) => [b.id, b]));

export function bossFor(from: OrganId, to: OrganId): BossSpec {
    return BY_ID.get(`${from}>${to}`) || BOSSES[0];
}

export function bossById(id: string): BossSpec | null {
    return BY_ID.get(id) || null;
}

export function mutationFrom(spec: BossSpec): BossMutation {
    return {
        traits: [],
        color: spec.color,
        accent: spec.accent,
        dashTimer: spec.play === 'pseudopod' ? 2.6 : spec.play === 'embolus' ? 3.6 : spec.play === 'adhere' ? 2.4 : 1.8,
        shootTimer: spec.play === 'capsid' ? 1.55 : spec.play === 'reactivate' ? 2.8 : 2.2,
        acidTimer: 1.8,
        baseSpeed: spec.speed,
        id: spec.id,
        play: spec.play,
        shape: spec.shape,
        phase: 0,
        split: false,
        open: false,
        attack: 0,
        enraged: false,
    };
}

// Idle stays inside the published silhouette. Fusiform rods writhe on their own,
// coccal chains flex, filaments sway, and the trypomastigote keeps its C
// while the flagellum undulates. An attack only leans, scales, and glows.
export function drawBossShape(
    ctx: CanvasRenderingContext2D,
    shape: BossShape,
    color: string,
    accent: string,
    r: number,
    time: number,
    flash = false,
    open = false,
    split = false,
    attack = 0,
) {
    const ink = flash ? '#ffffff' : color;
    const line = flash ? '#ffffff' : '#1a0c0c';
    const stir = Math.max(0, Math.min(1, attack));
    ctx.save();
    ctx.translate(Math.sin(time / 80) * r * 0.035 * stir, Math.sin(time / 480) * r * 0.05);
    if (stir > 0.04) {
        ctx.scale(1 + stir * 0.06, 1 - stir * 0.03);
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8 + stir * 16;
    }
    ctx.fillStyle = ink;
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(3, r * 0.045);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const blob = (sides: number, wobble: number, rad: number, spin: number) => {
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const a = spin + (i / sides) * Math.PI * 2;
            const w = rad * (1 + Math.sin(a * 3 + time / 260) * wobble);
            const x = Math.cos(a) * w;
            const y = Math.sin(a) * w;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    };

    if (shape === 'spindle') {
        for (let i = -1; i <= 1; i++) {
            const writhe = Math.sin(time / 240 + i * 2.1);
            ctx.save();
            ctx.rotate(i * 0.55 + writhe * 0.32);
            ctx.translate(writhe * r * 0.08, Math.cos(time / 280 + i) * r * 0.06);
            ctx.scale(1, 0.94 + Math.abs(writhe) * 0.08);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.22, r * 0.92, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    } else if (shape === 'chain') {
        const n = 8;
        for (let i = 0; i < n; i++) {
            const a = -1.1 + (i / (n - 1)) * 2.2 + Math.sin(time / 420 + i * 0.35) * 0.22;
            const x = Math.sin(a) * r * 0.78;
            const y = (i - (n - 1) / 2) * r * 0.22 + Math.sin(time / 210 + i * 0.85) * r * 0.08;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    } else if (shape === 'filament') {
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(4, r * 0.06);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + time / 900;
            const reach = 0.78 + 0.17 * Math.sin(time / 320 + i);
            const bow = Math.sin(time / 240 + i * 1.3) * r * 0.12;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(Math.cos(a + 0.4) * r * 0.4 + bow, Math.sin(a + 1) * r * 0.4, Math.cos(a) * r * reach, Math.sin(a) * r * reach);
            ctx.stroke();
        }
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = line;
        ctx.stroke();
    } else if (shape === 'cluster' || shape === 'grapes') {
        const n = shape === 'grapes' ? 11 : 8;
        const spread = shape === 'grapes' ? 0.55 : 0.42;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + time / 800;
            const ring = i === 0 ? 0 : r * spread * (0.55 + (i % 3) * 0.22);
            ctx.beginPath();
            ctx.arc(Math.cos(a) * ring, Math.sin(a) * ring, r * (shape === 'grapes' ? 0.24 : 0.2), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    } else if (shape === 'yeast' || shape === 'broadBud') {
        const neck = shape === 'broadBud' ? 0.34 : 0.16;
        const budR = split ? r * 0.34 : r * 0.28;
        const budX = split ? r * 0.7 : r * 0.42;
        ctx.beginPath();
        ctx.ellipse(-r * 0.08, 0, r * 0.48, r * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(budX, -r * 0.28, budR, budR * 0.85, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(5, r * neck * 0.35);
        ctx.beginPath();
        ctx.moveTo(r * 0.12, -r * 0.08);
        ctx.lineTo(budX - budR * 0.4, -r * 0.16);
        ctx.stroke();
        if (shape === 'yeast') {
            ctx.lineWidth = Math.max(3, r * 0.05);
            ctx.beginPath();
            ctx.moveTo(-r * 0.2, r * 0.2);
            ctx.quadraticCurveTo(r * 0.1, r * 0.7, r * 0.45, r * 0.85);
            ctx.stroke();
        }
    } else if (shape === 'trypo') {
        ctx.rotate(Math.sin(time / 280) * (0.34 + stir * 0.4));
        ctx.lineWidth = Math.max(8, r * 0.16);
        ctx.strokeStyle = ink;
        ctx.beginPath();
        ctx.arc(r * 0.05, 0, r * 0.62, 0.4, Math.PI * 1.7);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(-r * 0.42, r * 0.28, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(2, r * 0.035);
        const flick = r * 0.12 * (1 + stir * 2.2);
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -r * 0.35);
        for (let i = 0; i < 6; i++) ctx.lineTo(r * 0.55 + i * r * 0.08, -r * 0.35 + Math.sin(time / 90 + i * 0.9) * flick);
        ctx.stroke();
    } else if (shape === 'amoeba') {
        blob(14, 0.22, r * 0.78, time / 600);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = flash ? '#fff' : '#f4e2c8';
        ctx.beginPath();
        ctx.arc(-r * 0.12, -r * 0.08, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#e23a3a';
        ctx.beginPath();
        ctx.arc(r * 0.22, r * 0.16, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
    } else if (shape === 'capsuleRod') {
        ctx.globalAlpha = flash ? 1 : 0.35;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.95, r * 0.72, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = ink;
        ctx.strokeStyle = line;
        for (const [tilt, k] of [[-0.5, 0], [0.35, 1]] as const) {
            ctx.save();
            ctx.rotate(tilt + Math.sin(time / 280 + k * 2) * 0.16);
            ctx.translate(Math.sin(time / 340 + k) * r * 0.04, 0);
            ctx.beginPath();
            ctx.roundRect(-r * 0.16, -r * 0.42, r * 0.32, r * 0.84, r * 0.16);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    } else if (shape === 'shortRod') {
        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((i / 5) * Math.PI + time / 900);
            ctx.translate(r * 0.28 + Math.sin(time / 260 + i) * r * 0.05, Math.cos(time / 300 + i) * r * 0.04);
            ctx.beginPath();
            ctx.roundRect(-r * 0.1, -r * 0.28, r * 0.2, r * 0.56, r * 0.1);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    } else if (shape === 'capsid') {
        ctx.rotate(time / 800);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a) * r * 0.8;
            const y = Math.sin(a) * r * 0.8;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
        }
        ctx.stroke();
    } else if (shape === 'rod') {
        ctx.rotate(Math.sin(time / 400) * 0.6);
        ctx.shadowColor = accent;
        ctx.shadowBlur = r * 0.4;
        ctx.beginPath();
        ctx.roundRect(-r * 0.22, -r * 0.82, r * 0.44, r * 1.64, r * 0.22);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.stroke();
    } else if (shape === 'schisto') {
        ctx.rotate(Math.sin(time / 350) * 0.35);
        const curl = Math.sin(time / 280) * r * 0.14;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.8);
        ctx.bezierCurveTo(r * 0.7 + curl, -r * 0.2, -r * 0.7 - curl, r * 0.2, 0, r * 0.55);
        ctx.lineWidth = Math.max(10, r * 0.2);
        ctx.strokeStyle = ink;
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, -r * 0.55, r * 0.12, 0, Math.PI * 2);
        ctx.arc(0, -r * 0.15, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(4, r * 0.06);
        ctx.beginPath();
        ctx.moveTo(0, r * 0.55);
        ctx.lineTo(-r * 0.28, r * 0.95);
        ctx.moveTo(0, r * 0.55);
        ctx.lineTo(r * 0.28, r * 0.95);
        ctx.stroke();
    } else if (shape === 'cords') {
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(4, r * 0.07);
        for (let i = -2; i <= 2; i++) {
            const bend = Math.sin(time / 260 + i * 0.9) * r * 0.09;
            ctx.beginPath();
            ctx.moveTo(-r * 0.15 + i * r * 0.14, -r * 0.85);
            ctx.bezierCurveTo(
                r * 0.4 + i * r * 0.1 + bend, -r * 0.2,
                -r * 0.4 + i * r * 0.1 - bend, r * 0.2,
                r * 0.1 + i * r * 0.14, r * 0.85,
            );
            ctx.stroke();
        }
    } else if (shape === 'halo') {
        ctx.globalAlpha = flash ? 0.9 : 0.28;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = ink;
        ctx.strokeStyle = line;
        ctx.beginPath();
        ctx.arc(-r * 0.08, r * 0.04, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r * 0.22, -r * 0.16, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (shape === 'envelope') {
        blob(10, 0.14, r * 0.8, time / 700);
        ctx.globalAlpha = flash ? 1 : 0.8;
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + time / 500;
            const x = Math.cos(a) * r * 0.32;
            const y = Math.sin(a) * r * 0.32;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (shape === 'cyst') {
        ctx.globalAlpha = flash ? 1 : 0.45;
        ctx.fillStyle = accent;
        ctx.beginPath();
        if (open) ctx.arc(0, 0, r * 0.86, 0.4, Math.PI * 1.8);
        else ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = ink;
        ctx.stroke();
        const s = open ? r * 0.34 : r * 0.2;
        ctx.fillStyle = flash ? '#fff' : '#3a2a22';
        ctx.beginPath();
        ctx.arc(open ? r * 0.2 : 0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = flash ? '#fff' : '#f2e2c8';
        ctx.lineWidth = Math.max(2, r * 0.04);
        ctx.beginPath();
        const twitch = Math.sin(time / 160) * s * 0.18;
        ctx.moveTo((open ? r * 0.2 : 0) - s * 0.2, -s * 0.1);
        ctx.lineTo((open ? r * 0.2 : 0) - s * 0.8, -s * 0.7 + twitch);
        ctx.moveTo((open ? r * 0.2 : 0) + s * 0.2, -s * 0.1);
        ctx.lineTo((open ? r * 0.2 : 0) + s * 0.7, -s * 0.75 - twitch);
        ctx.stroke();
    } else if (shape === 'crescent') {
        ctx.lineWidth = Math.max(8, r * 0.14);
        ctx.strokeStyle = ink;
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate((i / 3) * Math.PI * 2 + time / 400);
            ctx.translate(r * 0.28, 0);
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.34, 0.6, Math.PI * 1.55);
            ctx.stroke();
            ctx.restore();
        }
    } else if (shape === 'coil') {
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(6, r * 0.1);
        ctx.beginPath();
        const turns = 3.2;
        for (let i = 0; i <= 48; i++) {
            const u = i / 48;
            const a = u * turns * Math.PI * 2 + time / 500;
            const rad = r * (0.12 + u * 0.78);
            const x = Math.cos(a) * rad;
            const y = Math.sin(a) * rad * 0.72;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    ctx.restore();
}
