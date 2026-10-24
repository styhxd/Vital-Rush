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
        intro: text('Fusos da gengiva descem e abrem pus no fígado.', 'Spindles from the gum drop and open pus in the liver.', 'Husos de la encía bajan y abren pus en el hígado.'),
        trick: text('Anda devagar e larga poças que queimam quem fica.', 'It drifts and leaves puddles that burn whoever stays.', 'Anda despacio y suelta charcos que queman a quien se queda.'),
        lesson: text(
            'Fusobacterium nucleatum é um bastão anaeróbio em forma de fuso, pontudo nas duas pontas, comum na placa do dente. Da boca ele entra no sangue e é um dos poucos que abrem abscesso sozinhos dentro do fígado.',
            'Fusobacterium nucleatum is an anaerobic rod drawn to a point at both ends, common in tooth plaque. From the mouth it enters the blood, and it is one of the few that opens an abscess in the liver on its own.',
            'Fusobacterium nucleatum es un bastón anaerobio en forma de huso, puntiagudo en los dos extremos, común en la placa del diente. De la boca entra en la sangre y es de los pocos que abren un absceso solos dentro del hígado.',
        ),
    },
    {
        id: 'molar>heart', from: 'molar', to: 'heart', shape: 'chain', play: 'embolus',
        color: '#7ddec8', accent: '#1c6b62', hp: 1, speed: 0.4, radius: 100,
        short: text('S. SANGUINIS', 'S. SANGUINIS', 'S. SANGUINIS'),
        disease: text('Endocardite', 'Endocarditis', 'Endocarditis'),
        intro: text('A cadeia da boca gruda na válvula e solta êmbolos.', 'The chain from the mouth sticks to the valve and throws emboli.', 'La cadena de la boca se pega a la válvula y suelta émbolos.'),
        trick: text('Dispara na sua direção e, no tranco, solta um leque de cocos.', 'It lunges at you and, on the jerk, throws a fan of cocci.', 'Se lanza hacia ti y, en el tirón, suelta un abanico de cocos.'),
        lesson: text(
            'Streptococcus sanguinis vive em cadeia na boca e é dos nomes clássicos da endocardite. Uma sangria pequena da gengiva joga a cadeia no sangue; se a válvula já tem uma ferida, ela gruda na fibrina e cresce lá.',
            'Streptococcus sanguinis lives as a chain in the mouth and is one of the classic names of endocarditis. A small gum bleed throws the chain into the blood; if the valve is already hurt, it sticks to the fibrin and grows there.',
            'Streptococcus sanguinis vive en cadena en la boca y es de los nombres clásicos de la endocarditis. Un sangrado chico de la encía tira la cadena a la sangre; si la válvula ya está herida, se pega a la fibrina y crece ahí.',
        ),
    },
    {
        id: 'molar>lung', from: 'molar', to: 'lung', shape: 'filament', play: 'filament',
        color: '#e6c15a', accent: '#8a5a12', hp: 1.35, speed: 0.2, radius: 118,
        short: text('A. ISRAELII', 'A. ISRAELII', 'A. ISRAELII'),
        disease: text('Actinomicose', 'Actinomycosis', 'Actinomicosis'),
        intro: text('Filamentos da boca são aspirados e armam grânulos no pulmão.', 'Filaments from the mouth are aspirated and build granules in the lung.', 'Filamentos de la boca se aspiran y arman gránulos en el pulmón.'),
        trick: text('Quase não corre. Solta grânulos amarelos que queimam o chão.', 'It barely runs. It drops yellow granules that burn the floor.', 'Casi no corre. Suelta gránulos amarillos que queman el suelo.'),
        lesson: text(
            'Actinomyces israelii parece um fungo e é bactéria: filamentos que se ramificam, amarrados num grânulo amarelo, o grânulo de enxofre. Mora na boca. Quando a secreção é aspirada, o mesmo grânulo abre a actinomicose dentro do pulmão.',
            'Actinomyces israelii looks like a fungus and is a bacterium: branching filaments tied into a yellow grain, the sulfur granule. It lives in the mouth. When the secretion is aspirated, the same grain opens actinomycosis inside the lung.',
            'Actinomyces israelii parece un hongo y es bacteria: filamentos que se ramifican, atados en un gránulo amarillo, el gránulo de azufre. Vive en la boca. Cuando la secreción se aspira, el mismo gránulo abre la actinomicosis dentro del pulmón.',
        ),
    },
    {
        id: 'molar>brain', from: 'molar', to: 'brain', shape: 'cluster', play: 'cluster',
        color: '#ff8f6b', accent: '#a33b2a', hp: 0.95, speed: 0.34, radius: 100,
        short: text('S. ANGINOSUS', 'S. ANGINOSUS', 'S. ANGINOSUS'),
        disease: text('Abscesso cerebral', 'Brain abscess', 'Absceso cerebral'),
        intro: text('Cocos pequenos do dente sobem e semeiam o cérebro.', 'Small cocci from the tooth climb and seed the brain.', 'Cocos chicos del diente suben y siembran el cerebro.'),
        trick: text('Atira um leque largo de sementes. Cada uma dói.', 'It fires a wide fan of seeds. Each one hurts.', 'Dispara un abanico ancho de semillas. Cada una duele.'),
        lesson: text(
            'Streptococcus anginosus, do grupo milleri, é um coco miúdo que adora abscesso. Um foco no molar pode subir pela veia da face ou pelo sangue e abrir abscesso dentro do cérebro. O truque dele não é a pressa. É fundar um foco novo.',
            'Streptococcus anginosus, of the milleri group, is a tiny coccus that loves an abscess. A focus in the molar can climb the facial vein or the blood and open an abscess inside the brain. Its trick is not speed. It is founding a new focus.',
            'Streptococcus anginosus, del grupo milleri, es un coco chico que adora el absceso. Un foco en el molar puede subir por la vena de la cara o por la sangre y abrir un absceso dentro del cerebro. Su truco no es la prisa. Es fundar un foco nuevo.',
        ),
    },
    {
        id: 'liver>molar', from: 'liver', to: 'molar', shape: 'yeast', play: 'bud',
        color: '#f2efe6', accent: '#c9b89a', hp: 1.05, speed: 0.36, radius: 96,
        short: text('C. ALBICANS', 'C. ALBICANS', 'C. ALBICANS'),
        disease: text('Sapinho', 'Thrush', 'Muguet'),
        intro: text('O fígado que falha deixa o fungo da boca tomar a gengiva.', 'A failing liver lets the mouth’s fungus take the gum.', 'El hígado que falla deja que el hongo de la boca tome la encía.'),
        trick: text('Na metade da vida ele se parte: fica menor, mais rápido, e solta um broto.', 'At half health it splits: smaller, faster, and it throws a bud.', 'A la mitad de la vida se parte: queda menor, más rápido, y suelta un brote.'),
        lesson: text(
            'Candida albicans é um fungo que já mora na boca. A célula é oval e solta um broto; quando invade, as células ficam em fila e viram uma pseudohifa. Fígado que não dá conta derruba a defesa, e o mesmo fungo cobre a gengiva de branco.',
            'Candida albicans is a fungus that already lives in the mouth. The cell is oval and throws a bud; when it invades, the cells line up into a pseudohypha. A liver that cannot keep up drops the defense, and the same fungus covers the gum in white.',
            'Candida albicans es un hongo que ya vive en la boca. La célula es ovalada y suelta un brote; cuando invade, las células se alinean y arman una pseudohifa. Un hígado que no da abasto baja la defensa, y el mismo hongo cubre la encía de blanco.',
        ),
    },
    {
        id: 'liver>heart', from: 'liver', to: 'heart', shape: 'trypo', play: 'flagellum',
        color: '#d7e07a', accent: '#6a7420', hp: 0.9, speed: 0.34, radius: 100,
        short: text('T. CRUZI', 'T. CRUZI', 'T. CRUZI'),
        disease: text('Doença de Chagas', 'Chagas disease', 'Enfermedad de Chagas'),
        intro: text('O tripanossoma deixa o fígado e se instala no músculo do coração.', 'The trypanosome leaves the liver and settles in the heart muscle.', 'El tripanosoma deja el hígado y se instala en el músculo del corazón.'),
        trick: text('Não vai reto. O flagelo desenha uma onda e ele corta de lado.', 'It does not go straight. The flagellum draws a wave and it cuts sideways.', 'No va recto. El flagelo dibuja una onda y corta de lado.'),
        lesson: text(
            'Trypanosoma cruzi, no sangue, é uma curva em C ou em U, com um ponto escuro atrás, o cinetoplasto, e uma membrana que ondula até o flagelo. Na fase aguda o fígado incha. O lugar onde ele se esconde de verdade, como ninho dentro da célula, é o músculo do coração.',
            'Trypanosoma cruzi, in the blood, is a C or a U, with a dark dot behind it, the kinetoplast, and a membrane that waves out to the flagellum. In the acute phase the liver swells. The place it truly hides, as a nest inside the cell, is the heart muscle.',
            'Trypanosoma cruzi, en la sangre, es una curva en C o en U, con un punto oscuro atrás, el cinetoplasto, y una membrana que ondula hasta el flagelo. En la fase aguda el hígado se hincha. El lugar donde de verdad se esconde, como nido dentro de la célula, es el músculo del corazón.',
        ),
    },
    {
        id: 'liver>lung', from: 'liver', to: 'lung', shape: 'amoeba', play: 'pseudopod',
        color: '#c46a5a', accent: '#6e2218', hp: 1.15, speed: 0.22, radius: 120,
        short: text('E. HISTOLYTICA', 'E. HISTOLYTICA', 'E. HISTOLYTICA'),
        disease: text('Amebíase pleuropulmonar', 'Pleuropulmonary amebiasis', 'Amebiasis pleuropulmonar'),
        intro: text('O abscesso do fígado rompe o diafragma e cai no pulmão.', 'The liver abscess breaks the diaphragm and falls into the lung.', 'El absceso del hígado rompe el diafragma y cae al pulmón.'),
        trick: text('Fica quieta, avisa, e dá um bote. Onde passou, fica uma mancha.', 'It holds still, warns, and lunges. Where it passed, a stain stays.', 'Se queda quieta, avisa y da un salto. Donde pasó, queda una mancha.'),
        lesson: text(
            'Entamoeba histolytica, na forma que come, é uma célula sem forma fixa, com um núcleo redondo e, muitas vezes, uma hemácia engolida dentro. O abscesso que ela abre no fígado pode romper o diafragma. O pus desce para a pleura e o pulmão é a sala seguinte.',
            'Entamoeba histolytica, in the form that feeds, is a cell with no fixed shape, a round nucleus, and often a swallowed red cell inside. The abscess it opens in the liver can rupture the diaphragm. The pus drops into the pleura, and the lung is the next room.',
            'Entamoeba histolytica, en la forma que come, es una célula sin forma fija, con un núcleo redondo y, muchas veces, un glóbulo rojo tragado adentro. El absceso que abre en el hígado puede romper el diafragma. El pus baja a la pleura y el pulmón es la sala siguiente.',
        ),
    },
    {
        id: 'liver>brain', from: 'liver', to: 'brain', shape: 'capsuleRod', play: 'capsule',
        color: '#f2d2dc', accent: '#e7eef8', hp: 1.5, speed: 0.18, radius: 128,
        short: text('K. PNEUMONIAE', 'K. PNEUMONIAE', 'K. PNEUMONIAE'),
        disease: text('Abscesso metastático', 'Metastatic abscess', 'Absceso metastásico'),
        intro: text('O bastão com cápsula sai do fígado e semeia o cérebro.', 'The rod with a capsule leaves the liver and seeds the brain.', 'El bastón con cápsula sale del hígado y siembra el cerebro.'),
        trick: text('A cápsula aguenta. De vez em quando ela solta um anel de tiros lentos.', 'The capsule soaks hits. Now and then it sheds a ring of slow shots.', 'La cápsula aguanta. De vez en cuando suelta un anillo de tiros lentos.'),
        lesson: text(
            'A Klebsiella pneumoniae hipervirulenta é um bastão gordo envolto numa cápsula de muco tão grossa que o laboratório a estica num fio. O quadro clássico é abscesso no fígado que manda metástase infecciosa para o cérebro.',
            'Hypervirulent Klebsiella pneumoniae is a fat rod wrapped in a mucus capsule so thick the lab can stretch it into a string. The classic picture is a liver abscess that sends an infectious metastasis to the brain.',
            'La Klebsiella pneumoniae hipervirulenta es un bastón gordo envuelto en una cápsula de moco tan gruesa que el laboratorio la estira en un hilo. El cuadro clásico es un absceso en el hígado que manda una metástasis infecciosa al cerebro.',
        ),
    },
    {
        id: 'heart>molar', from: 'heart', to: 'molar', shape: 'shortRod', play: 'adhere',
        color: '#d9a441', accent: '#6e4a12', hp: 1.05, speed: 0.62, radius: 92,
        short: text('A. ACTINOMYCETEMCOMITANS', 'A. ACTINOMYCETEMCOMITANS', 'A. ACTINOMYCETEMCOMITANS'),
        disease: text('Volta à gengiva', 'Back to the gum', 'Vuelta a la encía'),
        intro: text('O bastão da válvula volta para o bolso do dente, de onde saiu.', 'The rod from the valve goes back to the tooth pocket it came from.', 'El bastón de la válvula vuelve al bolsillo del diente, de donde salió.'),
        trick: text('Gruda. Chega perto e o contato é o ataque. Quase não atira.', 'It sticks. It gets close and contact is the attack. It barely shoots.', 'Se pega. Se acerca y el contacto es el ataque. Casi no dispara.'),
        lesson: text(
            'Aggregatibacter actinomycetemcomitans é um bastão curto da gengiva doente e, ao mesmo tempo, um dos HACEK, o grupo que senta em válvula. A bacteremia da endocardite devolve o mesmo bastão ao bolso periodontal. A viagem de volta é ele indo para casa.',
            'Aggregatibacter actinomycetemcomitans is a short rod of the sick gum and, at the same time, one of the HACEK, the group that sits on a valve. Endocarditis bacteremia returns the same rod to the periodontal pocket. The trip back is it going home.',
            'Aggregatibacter actinomycetemcomitans es un bastón corto de la encía enferma y, a la vez, uno de los HACEK, el grupo que se sienta en la válvula. La bacteremia de la endocarditis devuelve el mismo bastón al bolsillo periodontal. El viaje de vuelta es él yendo a casa.',
        ),
    },
    {
        id: 'heart>liver', from: 'heart', to: 'liver', shape: 'capsid', play: 'capsid',
        color: '#9fd7ff', accent: '#d6ecff', hp: 0.72, speed: 0.7, radius: 78,
        short: text('COXSACKIE B', 'COXSACKIE B', 'COXSACKIE B'),
        disease: text('Miocardite e hepatite', 'Myocarditis and hepatitis', 'Miocarditis y hepatitis'),
        intro: text('O vírus do músculo cardíaco segue no sangue e inflama o fígado.', 'The virus of the heart muscle stays in the blood and inflames the liver.', 'El virus del músculo cardíaco sigue en la sangre e inflama el hígado.'),
        trick: text('Pequeno e rápido. Cospe tiros curtos, um atrás do outro.', 'Small and fast. It spits short shots, one after another.', 'Chico y rápido. Escupe tiros cortos, uno detrás del otro.'),
        lesson: text(
            'Coxsackievírus B é um enterovírus. Por fora, uma cápsula geométrica de vinte faces, sem envelope. O órgão que ele mais castiga é o coração: miocardite. O mesmo vírus, no sangue, inflama o fígado. A sala seguinte é essa hepatite.',
            'Coxsackievirus B is an enterovirus. Outside, a geometric shell of twenty faces, no envelope. The organ it punishes most is the heart: myocarditis. The same virus, in the blood, inflames the liver. The next room is that hepatitis.',
            'Coxsackievirus B es un enterovirus. Por fuera, una cápsula geométrica de veinte caras, sin envoltura. El órgano que más castiga es el corazón: miocarditis. El mismo virus, en la sangre, inflama el hígado. La sala siguiente es esa hepatitis.',
        ),
    },
    {
        id: 'heart>lung', from: 'heart', to: 'lung', shape: 'rod', play: 'abscess',
        color: '#5dcaa8', accent: '#1f8a62', hp: 1.1, speed: 0.32, radius: 108,
        short: text('P. AERUGINOSA', 'P. AERUGINOSA', 'P. AERUGINOSA'),
        disease: text('Êmbolo pulmonar', 'Pulmonary embolus', 'Émbolo pulmonar'),
        intro: text('O que cresce na direita do coração viaja e pinta o pulmão de verde.', 'What grows on the right of the heart travels and paints the lung green.', 'Lo que crece a la derecha del corazón viaja y pinta el pulmón de verde.'),
        trick: text('Larga poças verdes. Ficar em cima delas come a vida.', 'It leaves green puddles. Standing on them eats health.', 'Suelta charcos verdes. Quedarse encima come la vida.'),
        lesson: text(
            'Pseudomonas aeruginosa é um bastão que fabrica piocianina, o pigmento que deixa a cultura verde. Vegetação na válvula direita solta pedaços na artéria pulmonar. O pulmão é o primeiro filtro, e esse bastão adora o lugar úmido que encontra lá.',
            'Pseudomonas aeruginosa is a rod that makes pyocyanin, the pigment that turns a culture green. A vegetation on the right valve throws pieces into the pulmonary artery. The lung is the first filter, and this rod loves the wet room it finds there.',
            'Pseudomonas aeruginosa es un bastón que fabrica piocianina, el pigmento que deja el cultivo verde. Una vegetación en la válvula derecha suelta pedazos en la arteria pulmonar. El pulmón es el primer filtro, y este bastón adora el sitio húmedo que encuentra ahí.',
        ),
    },
    {
        id: 'heart>brain', from: 'heart', to: 'brain', shape: 'grapes', play: 'embolus',
        color: '#f0c24a', accent: '#c9842a', hp: 1.05, speed: 0.38, radius: 110,
        short: text('S. AUREUS', 'S. AUREUS', 'S. AUREUS'),
        disease: text('Êmbolo séptico', 'Septic embolus', 'Émbolo séptico'),
        intro: text('Cachos dourados saem da válvula e sobem até o cérebro.', 'Gold clusters leave the valve and climb to the brain.', 'Racimos dorados salen de la válvula y suben hasta el cerebro.'),
        trick: text('O tranco é um êmbolo: ele avança e espalha cocos.', 'The jerk is an embolus: it surges and scatters cocci.', 'El tirón es un émbolo: avanza y esparce cocos.'),
        lesson: text(
            'Staphylococcus aureus se agrupa como um cacho de uva, e o nome aureus é a cor de ouro da colônia. Na endocardite do lado esquerdo, pedaços da vegetação sobem pelas carótidas. Cada pedaço é um êmbolo séptico, e o cérebro é onde ele para.',
            'Staphylococcus aureus groups like a bunch of grapes, and aureus is the gold color of the colony. In left-sided endocarditis, pieces of the vegetation climb the carotids. Each piece is a septic embolus, and the brain is where it stops.',
            'Staphylococcus aureus se agrupa como un racimo de uvas, y aureus es el color de oro de la colonia. En la endocarditis del lado izquierdo, pedazos de la vegetación suben por las carótidas. Cada pedazo es un émbolo séptico, y el cerebro es donde se detiene.',
        ),
    },
    {
        id: 'lung>molar', from: 'lung', to: 'molar', shape: 'broadBud', play: 'bud',
        color: '#e7d7c4', accent: '#8d6a48', hp: 1.1, speed: 0.3, radius: 104,
        short: text('B. DERMATITIDIS', 'B. DERMATITIDIS', 'B. DERMATITIDIS'),
        disease: text('Blastomicose', 'Blastomycosis', 'Blastomicosis'),
        intro: text('O fungo do pulmão se espalha e abre ferida na boca.', 'The lung fungus spreads and opens a wound in the mouth.', 'El hongo del pulmón se esparce y abre una herida en la boca.'),
        trick: text('Parede grossa. Quando quebra, o broto largo se solta e ele acelera.', 'A thick wall. When it breaks, the wide bud comes off and it speeds up.', 'Pared gruesa. Cuando se rompe, el brote ancho se suelta y acelera.'),
        lesson: text(
            'Blastomyces dermatitidis, no tecido, é uma levedura de parede grossa com um broto de base larga. Isso separa ele do Cryptococcus, cujo broto é estreito. A porta é o pulmão. Disseminado, ele abre úlcera na boca, e o molar é a sala seguinte.',
            'Blastomyces dermatitidis, in tissue, is a thick-walled yeast with a broad-based bud. That separates it from Cryptococcus, whose bud is narrow. The door is the lung. Disseminated, it opens an ulcer in the mouth, and the molar is the next room.',
            'Blastomyces dermatitidis, en el tejido, es una levadura de pared gruesa con un brote de base ancha. Eso lo separa del Cryptococcus, cuyo brote es estrecho. La puerta es el pulmón. Diseminado, abre una úlcera en la boca, y el molar es la sala siguiente.',
        ),
    },
    {
        id: 'lung>liver', from: 'lung', to: 'liver', shape: 'schisto', play: 'flagellum',
        color: '#c98b6a', accent: '#6a3030', hp: 0.95, speed: 0.5, radius: 114,
        short: text('S. MANSONI', 'S. MANSONI', 'S. MANSONI'),
        disease: text('Esquistossomose', 'Schistosomiasis', 'Esquistosomiasis'),
        intro: text('O verme jovem atravessa o pulmão a caminho do fígado.', 'The young worm crosses the lung on the way to the liver.', 'El gusano joven cruza el pulmón camino del hígado.'),
        trick: text('Nada em S, com as ventosas. Não mira em linha reta.', 'It swims in an S, suckers and all. It does not aim in a straight line.', 'Nada en S, con las ventosas. No apunta en línea recta.'),
        lesson: text(
            'Schistosoma mansoni entra pela pele, vira esquistossômulo e é obrigado a passar pelo pulmão. O destino é a veia da porta, encostado no fígado, onde o adulto solta os ovos. No desenho: corpo de verme, duas ventosas, e a cauda que ainda lembra a cercária.',
            'Schistosoma mansoni enters through the skin, becomes a schistosomulum, and has to pass through the lung. The destination is the portal vein, against the liver, where the adult sheds eggs. In the drawing: a worm body, two suckers, and a tail that still remembers the cercaria.',
            'Schistosoma mansoni entra por la piel, se vuelve esquistosómulo y está obligado a pasar por el pulmón. El destino es la vena porta, contra el hígado, donde el adulto suelta los huevos. En el dibujo: cuerpo de gusano, dos ventosas, y la cola que todavía recuerda a la cercaria.',
        ),
    },
    {
        id: 'lung>heart', from: 'lung', to: 'heart', shape: 'cords', play: 'cord',
        color: '#e7d2a8', accent: '#8a7040', hp: 1.4, speed: 0.42, radius: 116,
        short: text('M. TUBERCULOSIS', 'M. TUBERCULOSIS', 'M. TUBERCULOSIS'),
        disease: text('Pericardite', 'Pericarditis', 'Pericarditis'),
        intro: text('Os cordões do pulmão encostam no pericárdio e tomam o coração.', 'The cords from the lung reach the pericardium and take the heart.', 'Los cordones del pulmón llegan al pericardio y toman el corazón.'),
        trick: text('Gira no próprio eixo e varre em volta. Chegar perto é levar o cordão.', 'It spins on its axis and sweeps around. Getting close means taking the cord.', 'Gira sobre su eje y barre alrededor. Acercarse es llevarse el cordón.'),
        lesson: text(
            'Mycobacterium tuberculosis é um bastão fino que, por causa de um lipídio da parede, cresce em cordão de serpente. Do pulmão a infecção desce por continuidade até o pericárdio. A pericardite tuberculosa é o coração sendo apertado por fora.',
            'Mycobacterium tuberculosis is a thin rod that, because of a lipid in the wall, grows in a serpentine cord. From the lung the infection walks by continuity to the pericardium. Tuberculous pericarditis is the heart being squeezed from the outside.',
            'Mycobacterium tuberculosis es un bastón fino que, por un lípido de la pared, crece en cordón de serpiente. Del pulmón la infección baja por continuidad hasta el pericardio. La pericarditis tuberculosa es el corazón apretado desde afuera.',
        ),
    },
    {
        id: 'lung>brain', from: 'lung', to: 'brain', shape: 'halo', play: 'capsule',
        color: '#f4f0ff', accent: '#c9b6ff', hp: 1.6, speed: 0.16, radius: 136,
        short: text('C. NEOFORMANS', 'C. NEOFORMANS', 'C. NEOFORMANS'),
        disease: text('Criptococose', 'Cryptococcosis', 'Criptococosis'),
        intro: text('A levedura do ar entra no pulmão e a cápsula sobe até a meninge.', 'The yeast from the air enters the lung and the capsule climbs to the meninges.', 'La levadura del aire entra al pulmón y la cápsula sube hasta la meninge.'),
        trick: text('O halo é a cápsula: aguenta muito e, às vezes, solta um anel.', 'The halo is the capsule: it soaks a lot and, sometimes, sheds a ring.', 'El halo es la cápsula: aguanta mucho y, a veces, suelta un anillo.'),
        lesson: text(
            'Cryptococcus neoformans é inspirado. No pulmão é uma levedura; na tinta nanquim do liquor, um halo claro em volta, porque a cápsula de polissacarídeo não deixa a tinta entrar. O broto é estreito. O passo seguinte famoso é a meninge.',
            'Cryptococcus neoformans is inhaled. In the lung it is a yeast; in the India ink of spinal fluid, a clear halo around it, because the polysaccharide capsule will not let the ink in. The bud is narrow. The famous next step is the meninges.',
            'Cryptococcus neoformans se inspira. En el pulmón es una levadura; en la tinta china del líquido, un halo claro alrededor, porque la cápsula de polisacárido no deja entrar la tinta. El brote es estrecho. El paso siguiente famoso es la meninge.',
        ),
    },
    {
        id: 'brain>molar', from: 'brain', to: 'molar', shape: 'envelope', play: 'reactivate',
        color: '#ffb7c8', accent: '#ffd6e4', hp: 0.9, speed: 0.3, radius: 96,
        short: text('HSV-1', 'HSV-1', 'HSV-1'),
        disease: text('Herpes labial', 'Cold sore', 'Herpes labial'),
        intro: text('O vírus dorme no gânglio e desce o nervo até a boca.', 'The virus sleeps in the ganglion and walks the nerve down to the mouth.', 'El virus duerme en el ganglio y baja el nervio hasta la boca.'),
        trick: text('Fica quieto, junta, e de repente solta um anel. É a reativação.', 'It stays quiet, gathers, and suddenly throws a ring. That is reactivation.', 'Se queda quieto, junta, y de pronto suelta un anillo. Es la reactivación.'),
        lesson: text(
            'HSV-1 entra pela boca e sobe pelo nervo até o gânglio do trigêmeo, onde fica quieto a vida inteira. Quando acorda, desce o mesmo nervo e reabre a lesão no lábio ou na gengiva. A cápsula de dentro é geométrica; por fora, um envelope mole.',
            'HSV-1 enters by the mouth and climbs the nerve to the trigeminal ganglion, where it stays quiet for life. When it wakes, it walks the same nerve down and reopens the lesion on the lip or the gum. The shell inside is geometric; outside, a soft envelope.',
            'HSV-1 entra por la boca y sube por el nervio hasta el ganglio del trigémino, donde se queda quieto toda la vida. Cuando despierta, baja el mismo nervio y reabre la lesión en el labio o la encía. La cápsula de adentro es geométrica; por fuera, una envoltura blanda.',
        ),
    },
    {
        id: 'brain>liver', from: 'brain', to: 'liver', shape: 'cyst', play: 'cyst',
        color: '#d5efe8', accent: '#f2fff8', hp: 1.45, speed: 0.2, radius: 124,
        short: text('T. SOLIUM', 'T. SOLIUM', 'T. SOLIUM'),
        disease: text('Cisticercose', 'Cysticercosis', 'Cisticercosis'),
        intro: text('O cisto quieto do cérebro se espalha, e o fígado é uma das salas.', 'The quiet cyst of the brain scatters, and the liver is one of the rooms.', 'El quiste quieto del cerebro se esparce, y el hígado es una de las salas.'),
        trick: text('A vesícula aguenta. Quando rompe, o escólex sai e ele corre.', 'The bladder soaks hits. When it breaks, the scolex comes out and it runs.', 'La vesícula aguanta. Cuando se rompe, el escólex sale y corre.'),
        lesson: text(
            'Taenia solium, no tecido, é um cisticerco: uma bolha de água com a cabeça do verme dentro, o escólex, de ganchos. O lugar clássico é o cérebro, a neurocisticercose. Quando os cistos se espalham, o fígado entra na lista. Quieto, é uma bolha. Aberto, é uma cabeça.',
            'Taenia solium, in tissue, is a cysticercus: a water blister with the worm’s head inside, the scolex, hooks and all. The classic place is the brain, neurocysticercosis. When the cysts scatter, the liver joins the list. Quiet, it is a blister. Open, it is a head.',
            'Taenia solium, en el tejido, es un cisticerco: una burbuja de agua con la cabeza del gusano adentro, el escólex, con ganchos. El sitio clásico es el cerebro, la neurocisticercosis. Cuando los quistes se esparcen, el hígado entra en la lista. Quieto, es una burbuja. Abierto, es una cabeza.',
        ),
    },
    {
        id: 'brain>heart', from: 'brain', to: 'heart', shape: 'crescent', play: 'crescent',
        color: '#b7e0ff', accent: '#4a7ea8', hp: 0.85, speed: 0.58, radius: 90,
        short: text('T. GONDII', 'T. GONDII', 'T. GONDII'),
        disease: text('Toxoplasmose', 'Toxoplasmosis', 'Toxoplasmosis'),
        intro: text('O crescente sai do cisto no cérebro e invade o músculo do coração.', 'The crescent leaves the cyst in the brain and invades the heart muscle.', 'El creciente sale del quiste en el cerebro e invade el músculo del corazón.'),
        trick: text('São vários crescentes. Cada um dá um bote curto e some de lado.', 'There are several crescents. Each one makes a short lunge and slips aside.', 'Son varios crecientes. Cada uno da un salto corto y se va de lado.'),
        lesson: text(
            'Toxoplasma gondii, na forma que invade, é um crescente. O nome vem de toxon, arco. O cisto quieto mora no cérebro. Quando rompe, os taquizoítos entram no sangue e um dos músculos que eles ocupam é o coração. Miocardite por toxoplasma é isso.',
            'Toxoplasma gondii, in the form that invades, is a crescent. The name comes from toxon, a bow. The quiet cyst lives in the brain. When it breaks, the tachyzoites enter the blood, and one of the muscles they occupy is the heart. Toxoplasma myocarditis is that.',
            'Toxoplasma gondii, en la forma que invade, es un creciente. El nombre viene de toxon, arco. El quiste quieto vive en el cerebro. Cuando se rompe, los taquizoítos entran en la sangre y uno de los músculos que ocupan es el corazón. La miocarditis por toxoplasma es eso.',
        ),
    },
    {
        id: 'brain>lung', from: 'brain', to: 'lung', shape: 'coil', play: 'coil',
        color: '#e0b48a', accent: '#8a5a32', hp: 1.1, speed: 0.42, radius: 108,
        short: text('A. CANTONENSIS', 'A. CANTONENSIS', 'A. CANTONENSIS'),
        disease: text('Angiostrongilíase', 'Angiostrongyliasis', 'Angiostrongiliasis'),
        intro: text('A larva se perde no cérebro. O endereço verdadeiro dela é o pulmão do rato.', 'The larva gets lost in the brain. Its real address is the rat’s lung.', 'La larva se pierde en el cerebro. Su dirección verdadera es el pulmón de la rata.'),
        trick: text('Enrola em volta de você. O círculo aperta e afrouxa.', 'It coils around you. The circle tightens and loosens.', 'Se enrolla a tu alrededor. El círculo aprieta y afloja.'),
        lesson: text(
            'Angiostrongylus cantonensis é o verme do pulmão do rato: o adulto mora na artéria pulmonar. Na pessoa, a larva se perde e sobe ao cérebro, e é daí a meningite eosinofílica. A sala seguinte desta viagem é o endereço de onde ele veio.',
            'Angiostrongylus cantonensis is the rat lungworm: the adult lives in the pulmonary artery. In a person, the larva gets lost and climbs to the brain, and that is eosinophilic meningitis. The next room of this trip is the address it came from.',
            'Angiostrongylus cantonensis es el gusano del pulmón de la rata: el adulto vive en la arteria pulmonar. En la persona, la larva se pierde y sube al cerebro, y de ahí la meningitis eosinofílica. La sala siguiente de este viaje es la dirección de donde vino.',
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
        dashTimer: spec.play === 'pseudopod' ? 2.4 : spec.play === 'embolus' ? 3.2 : 1.6,
        shootTimer: spec.play === 'capsid' ? 0.9 : spec.play === 'reactivate' ? 2.6 : 2.1,
        acidTimer: 1.8,
        baseSpeed: spec.speed,
        id: spec.id,
        play: spec.play,
        shape: spec.shape,
        phase: 0,
        split: false,
        open: false,
        attack: 0,
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
