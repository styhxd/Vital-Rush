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
        intro: text('Um palito da gengiva, fino nas duas pontas. Caiu no sangue e abriu pus no fígado.', 'A splinter from the gum, sharp at both ends. It rode the blood down and opened pus in the liver.', 'Un palito de la encía, afilado en las dos puntas. Bajó por la sangre y abrió pus en el hígado.'),
        trick: text('Anda devagar, larga poça que queima e, de vez em quando, investe. Na metade da vida quase some de vista e solta dois palitos iguais, que não levam dano e somem sozinhos.', 'It moves slow, leaves a burning puddle, and every so often charges. At half health it nearly fades from sight and sheds two lookalike splinters that take no damage and vanish on their own.', 'Anda despacio, deja un charco que quema y, de vez en cuando, embiste. A la mitad de la vida casi desaparece y suelta dos palitos iguales, que no reciben daño y se esfuman solos.'),
        lesson: text(
            'O Fusobacterium nucleatum parece um palito de dente, pontudo dos dois lados. Mora escondido na placa da gengiva. Quando cai no sangue, faz o que quase nenhuma bactéria faz sozinha: viaja até o fígado e abre um abscesso cheio de pus sem precisar de ajuda.',
            'Fusobacterium nucleatum looks like a toothpick, pointed at both ends. It lives tucked inside gum plaque. When it slips into the blood, it does what few bacteria pull off alone: it rides down to the liver and opens a pocket of pus without calling anyone else.',
            'El Fusobacterium nucleatum parece un palillo, puntiagudo en los dos extremos. Vive escondido en la placa de la encía. Cuando cae a la sangre, hace lo que casi ninguna bacteria logra sola: baja hasta el hígado y abre un absceso de pus sin llamar a nadie más.',
        ),
    },
    {
        id: 'molar>heart', from: 'molar', to: 'heart', shape: 'chain', play: 'embolus',
        color: '#7ddec8', accent: '#1c6b62', hp: 1, speed: 0.4, radius: 100,
        short: text('S. SANGUINIS', 'S. SANGUINIS', 'S. SANGUINIS'),
        disease: text('Endocardite', 'Endocarditis', 'Endocarditis'),
        intro: text('Um colar de cocos saído da gengiva. Achou uma válvula machucada e fez morada.', 'A string of cocci from a bleeding gum. It found a scarred heart valve and moved right in.', 'Un collar de cocos salido de la encía. Encontró una válvula lastimada y se quedó a vivir.'),
        trick: text('Avança no peito contra você e, no tranco da batida, espalha cocos.', 'It charges straight at you and scatters cocci on the jolt.', 'Se lanza de frente contra ti y, en el tirón del golpe, esparce cocos.'),
        lesson: text(
            'O Streptococcus sanguinis vive em fila, feito colar de contas na boca. Quando a gengiva sangra, essa fila inteira despenca na corrente sanguínea. Se encontra uma válvula do coração já machucada, ele gruda na malha de fibrina e levanta acampamento ali. O nome disso é endocardite.',
            'Streptococcus sanguinis lives in chains, like a string of beads in the mouth. When a gum bleeds, that whole line tumbles into the bloodstream. If it finds a heart valve that is already scarred, it glues itself to the fibrin mesh and builds a colony there. That is endocarditis.',
            'El Streptococcus sanguinis vive en fila, como un collar de cuentas en la boca. Cuando la encía sangra, esa fila entera cae al torrente sanguíneo. Si encuentra una válvula del corazón ya lastimada, se pega a la red de fibrina y crece ahí mismo. Eso se llama endocarditis.',
        ),
    },
    {
        id: 'molar>lung', from: 'molar', to: 'lung', shape: 'filament', play: 'filament',
        color: '#e6c15a', accent: '#8a5a12', hp: 1.35, speed: 0.2, radius: 118,
        short: text('A. ISRAELII', 'A. ISRAELII', 'A. ISRAELII'),
        disease: text('Actinomicose', 'Actinomycosis', 'Actinomicosis'),
        intro: text('Um grão amarelo da boca que desceu no fôlego. Parou no fundo do pulmão.', 'A yellow grain from the mouth, pulled down with a breath. It settled deep in the lung.', 'Un grano amarillo de la boca que bajó con el aire. Se quedó en el fondo del pulmón.'),
        trick: text('Quase não corre, mas solta grão amarelo que deixa o chão queimando.', 'It barely runs, dropping yellow grains that leave the floor burning.', 'Casi no corre, pero suelta un grano amarillo que deja el suelo quemando.'),
        lesson: text(
            'O Actinomyces israelii gosta de enganar: tem jeito de fungo, mas é bactéria. Seus filamentos se enrolam todos num caroço amarelo chamado grânulo de enxofre. Ele mora na boca. Quando a saliva é aspirada junto com o ar, esse grão desce errado e abre a actinomicose no pulmão.',
            'Actinomyces israelii plays tricks on the eye: it branches like a fungus, yet it is a bacterium. Its filaments tangle into a yellow lump called a sulfur granule. It lives in the mouth. When secretion goes down the wrong pipe with the air, that grain opens actinomycosis in the lung.',
            'El Actinomyces israelii engaña a la vista: parece hongo, pero es bacteria. Sus filamentos se enredan en una bolita amarilla llamada gránulo de azufre. Vive en la boca. Cuando la secreción se aspira junto con el aire, ese grano baja y abre la actinomicosis en el pulmón.',
        ),
    },
    {
        id: 'molar>brain', from: 'molar', to: 'brain', shape: 'cluster', play: 'cluster',
        color: '#ff8f6b', accent: '#a33b2a', hp: 0.95, speed: 0.34, radius: 100,
        short: text('S. ANGINOSUS', 'S. ANGINOSUS', 'S. ANGINOSUS'),
        disease: text('Abscesso cerebral', 'Brain abscess', 'Absceso cerebral'),
        intro: text('Cocos miúdos, viciados em fazer pus. Subiram do molar para abrir obra no cérebro.', 'Tiny cocci, hooked on making pus. They climbed from the molar to dig a new pocket in the brain.', 'Cocos diminutos, adictos al pus. Subieron desde el molar para abrir otro foco en el cerebro.'),
        trick: text('Dispara um leque largo de sementes em que cada uma tira um pouco de vida.', 'It fires a wide fan of seeds, and each one chips away a bit of health.', 'Dispara un abanico ancho de semillas donde cada una duele un poco.'),
        lesson: text(
            'O Streptococcus anginosus, da turma do grupo milleri, é um coco pequeno e viciado em formar abscesso. Um foco de pus na raiz do molar pega carona na veia da face ou no sangue e sobe. Lá dentro do cérebro, ele faz o que sabe: abre outro saco de pus do zero.',
            'Streptococcus anginosus, part of the milleri group, is a tiny coccus hooked on building abscesses. A pocket of pus at the molar root catches a ride up the facial vein or through the blood. Once inside the brain, it does what it knows best: starts a fresh abscess from scratch.',
            'El Streptococcus anginosus, del grupo milleri, es un coco chico y adicto a formar abscesos. Un foco de pus en la raíz del molar sube por la vena de la cara o por la sangre. Adentro del cerebro hace lo que mejor le sale: fundar una bolsa de pus nueva desde cero.',
        ),
    },
    {
        id: 'liver>molar', from: 'liver', to: 'molar', shape: 'yeast', play: 'bud',
        color: '#f2efe6', accent: '#c9b89a', hp: 1.05, speed: 0.36, radius: 96,
        short: text('C. ALBICANS', 'C. ALBICANS', 'C. ALBICANS'),
        disease: text('Sapinho', 'Thrush', 'Muguet'),
        intro: text('O fígado cansou de vigiar. O fungo que já morava na boca forrou a gengiva de branco.', 'The liver grew too tired to stand guard. The mouth\'s own fungus coated the gum in white.', 'El hígado se cansó de vigilar. El hongo que ya vivía en la boca tapizó la encía de blanco.'),
        trick: text('Na metade da vida ele se parte, ganha velocidade e solta um broto.', 'At half health it splits, picks up speed, and flings a bud.', 'A la mitad de la vida se parte, toma velocidad y suelta un brote.'),
        lesson: text(
            'A Candida albicans já é moradora antiga da boca. Quieta, é uma célula oval que solta broto. Quando parte para o ataque, as células esticam em fila e formam uma pseudohifa. Sem o fígado inteiro para segurar a imunidade, o tapete branco toma conta da gengiva: é o sapinho.',
            'Candida albicans is already an old resident of the mouth. Quiet, it is an oval cell that pops out a bud. When it goes on the attack, the cells stretch into a chain called a pseudohypha. Without a strong liver backing up the defenses, a white coat takes over the gum: thrush.',
            'La Candida albicans ya es vecina antigua de la boca. Quieta, es una célula ovalada que suelta un brote. Cuando pasa al ataque, las células se estiran en fila y forman una pseudohifa. Sin el hígado firme para sostener la defensa, el manto blanco cubre la encía: es el muguet.',
        ),
    },
    {
        id: 'liver>heart', from: 'liver', to: 'heart', shape: 'trypo', play: 'flagellum',
        color: '#d7e07a', accent: '#6a7420', hp: 0.9, speed: 0.42, radius: 100,
        short: text('T. CRUZI', 'T. CRUZI', 'T. CRUZI'),
        disease: text('Doença de Chagas', 'Chagas disease', 'Enfermedad de Chagas'),
        intro: text('Uma vírgula viva nadando no sangue. Deixou o fígado inchado e fez ninho no coração.', 'A living curve swimming through the blood. It left the swollen liver to nest in the heart muscle.', 'Una curva viva nadando en la sangre. Dejó el hígado hinchado e hizo nido en el corazón.'),
        trick: text('Nunca vem reto: o flagelo ondula cortando de lado e, na metade da vida, o corte estala.', 'It never comes straight: the flagellum waves to slash sideways, and at half health the cut snaps.', 'Nunca viene recto: el flagelo ondula cortando de lado y, a la mitad de la vida, el corte estalla.'),
        lesson: text(
            'Solto no sangue, o Trypanosoma cruzi tem corpo em C, um ponto escuro na traseira chamado cinetoplasto e uma membrana que ondula até a ponta do flagelo. Na fase aguda, o fígado incha na passagem. Mas o ninho definitivo, cavado dentro da fibra muscular, é o coração.',
            'Out in the blood, Trypanosoma cruzi bends like a C, sporting a dark rear dot called the kinetoplast and a membrane that ripples out to the flagellum. In the acute phase, the liver swells along the way. Yet its true nest, dug right inside the muscle cell, is the heart.',
            'Suelto en la sangre, el Trypanosoma cruzi se curva en C, con un punto oscuro atrás llamado cinetoplasto y una membrana que ondula hasta el flagelo. En la fase aguda, el hígado se hincha al paso. Pero el nido de verdad, cavado dentro de la célula muscular, es el corazón.',
        ),
    },
    {
        id: 'liver>lung', from: 'liver', to: 'lung', shape: 'amoeba', play: 'pseudopod',
        color: '#c46a5a', accent: '#6e2218', hp: 1.15, speed: 0.22, radius: 120,
        short: text('E. HISTOLYTICA', 'E. HISTOLYTICA', 'E. HISTOLYTICA'),
        disease: text('Amebíase pleuropulmonar', 'Pleuropulmonary amebiasis', 'Amebiasis pleuropulmonar'),
        intro: text('O abscesso da ameba furou o teto do fígado. Atravessou o diafragma e invadiu o pulmão.', 'The ameba\'s abscess chewed through the diaphragm and spilled straight into the lung.', 'El absceso de la ameba perforó el diafragma y se vació directo en el pulmón.'),
        trick: text('Para, avisa e dá o bote, deixando o rastro marcado no chão.', 'It stops, telegraphs, and lunges, leaving its trail burned into the floor.', 'Frena, avisa y pega el salto, dejando su rastro marcado en el suelo.'),
        lesson: text(
            'A Entamoeba histolytica caçando não tem forma fixa. Carrega um núcleo redondo e, quase sempre, uma hemácia inteira engolida na barriga. O abscesso que ela cava no fígado pode rasgar o diafragma. Aí o pus vaza direto para a pleura e o pulmão, na sala vizinha.',
            'When Entamoeba histolytica is feeding, it has no fixed shape. It carries a round nucleus and, quite often, a whole swallowed red blood cell inside. The abscess it carves out in the liver can tear right through the diaphragm, spilling pus into the pleura and lung next door.',
            'Cuando la Entamoeba histolytica está comiendo, no tiene forma fija. Lleva un núcleo redondo y, muchas veces, un glóbulo rojo entero tragado adentro. El absceso que cava en el hígado puede romper el diafragma, y el pus pasa directo a la pleura y al pulmón de al lado.',
        ),
    },
    {
        id: 'liver>brain', from: 'liver', to: 'brain', shape: 'capsuleRod', play: 'capsule',
        color: '#f2d2dc', accent: '#e7eef8', hp: 1.5, speed: 0.18, radius: 128,
        short: text('K. PNEUMONIAE', 'K. PNEUMONIAE', 'K. PNEUMONIAE'),
        disease: text('Abscesso metastático', 'Metastatic abscess', 'Absceso metastásico'),
        intro: text('Bastão gordo blindado de muco. Abriu abscesso no fígado e mandou filial para o cérebro.', 'A thick rod armored in mucus. It opened a liver abscess and shipped a new branch to the brain.', 'Un bastón gordo blindado en moco. Abrió un absceso en el hígado y mandó otro foco al cerebro.'),
        trick: text('A cápsula aguenta pancada e, de tempos em tempos, solta um anel de tiros lentos.', 'Its capsule takes a beating and every so often fires a ring of slow shots.', 'La cápsula aguanta los golpes y, cada tanto, suelta un anillo de tiros lentos.'),
        lesson: text(
            'A Klebsiella pneumoniae hipervirulenta é um bastão gordo, encapado num muco tão viscoso que a colônia estica feito fio de goma no laboratório. Ela começa abrindo um abscesso no fígado e não para ali: solta pedaços no sangue e instala metástase infecciosa lá no cérebro.',
            'Hypervirulent Klebsiella pneumoniae is a fat rod wrapped in a mucus capsule so sticky the colony stretches into a string in the lab. It starts by digging an abscess in the liver and does not stop there: it seeds the blood and plants an infectious metastasis in the brain.',
            'La Klebsiella pneumoniae hipervirulenta es un bastón gordo, envuelto en una cápsula de moco tan espesa que en el laboratorio la colonia se estira como un hilo. Empieza con un absceso en el hígado y de ahí manda por la sangre una metástasis infecciosa directo al cerebro.',
        ),
    },
    {
        id: 'heart>molar', from: 'heart', to: 'molar', shape: 'shortRod', play: 'adhere',
        color: '#d9a441', accent: '#6e4a12', hp: 1.05, speed: 0.36, radius: 92,
        short: text('A. ACTINOMYCETEMCOMITANS', 'A. ACTINOMYCETEMCOMITANS', 'A. ACTINOMYCETEMCOMITANS'),
        disease: text('Volta à gengiva', 'Back to the gum', 'Vuelta a la encía'),
        intro: text('O bastão que morava na válvula pegou o sangue de volta. Retornou ao bolso do dente.', 'The short rod on the heart valve rode the blood back. It returned to its old tooth pocket.', 'El bastón que vivía en la válvula tomó la sangre de regreso. Volvió al bolsillo del diente.'),
        trick: text('Quase não atira, mas gruda na pele: encostar nele já é o ataque.', 'It barely shoots, but it clings tight: getting close is already the attack.', 'Casi no dispara, pero se pega fuerte: acercarse ya es el ataque.'),
        lesson: text(
            'O Aggregatibacter actinomycetemcomitans é um bastão curto de gengiva inflamada e sócio do grupo HACEK, famoso por colonizar válvula cardíaca. Quando a endocardite solta bactéria de novo na circulação, esse bastão reencontra o bolso periodontal. Essa viagem é só ele voltando para casa.',
            'Aggregatibacter actinomycetemcomitans is a short rod from diseased gums and a member of the HACEK group, notorious for settling on heart valves. When endocarditis sheds bacteria back into the bloodstream, this rod finds its way back to the periodontal pocket. This trip is just a homecoming.',
            'El Aggregatibacter actinomycetemcomitans es un bastón corto de la encía enferma y miembro del grupo HACEK, conocido por instalarse en las válvulas del corazón. Cuando la endocarditis lanza bacterias de vuelta a la sangre, este bastón regresa al bolsillo periodontal. El viaje es su vuelta a casa.',
        ),
    },
    {
        id: 'heart>liver', from: 'heart', to: 'liver', shape: 'capsid', play: 'capsid',
        color: '#9fd7ff', accent: '#d6ecff', hp: 0.72, speed: 0.36, radius: 78,
        short: text('COXSACKIE B', 'COXSACKIE B', 'COXSACKIE B'),
        disease: text('Miocardite e hepatite', 'Myocarditis and hepatitis', 'Miocarditis y hepatitis'),
        intro: text('O vírus que inflamou o músculo do coração seguiu pelo sangue. Agora queima o fígado.', 'The virus that inflamed the heart muscle kept riding the blood. Now it burns in the liver.', 'El virus que inflamó el músculo del corazón siguió por la sangre. Ahora ataca el hígado.'),
        trick: text('Pequeno e ligeiro, cospe rajadas de tiros curtos um atrás do outro.', 'Small and quick, it spits bursts of short shots one right after another.', 'Chico y veloz, escupe ráfagas de tiros cortos uno detrás del otro.'),
        lesson: text(
            'O Coxsackievírus B é um enterovírus nu, fechado numa caixa geométrica de vinte faces sem envelope. O alvo que ele mais castiga é o músculo do coração, abrindo uma miocardite. Quando continua rodando pelo sangue, alcança o fígado e acende uma hepatite na sala seguinte.',
            'Coxsackievirus B is a naked enterovirus, locked in a twenty-sided geometric shell with no envelope. The target it punishes most is the heart muscle, causing myocarditis. As it keeps circulating in the blood, it reaches the liver and sparks hepatitis in the next room.',
            'El Coxsackievirus B es un enterovirus desnudo, armado como una caja de veinte caras sin envoltura. El órgano que más castiga es el corazón, donde causa miocarditis. Al seguir circulando por la sangre, llega al hígado y enciende una hepatitis en la sala siguiente.',
        ),
    },
    {
        id: 'heart>lung', from: 'heart', to: 'lung', shape: 'rod', play: 'abscess',
        color: '#5dcaa8', accent: '#1f8a62', hp: 1.1, speed: 0.32, radius: 108,
        short: text('P. AERUGINOSA', 'P. AERUGINOSA', 'P. AERUGINOSA'),
        disease: text('Êmbolo pulmonar', 'Pulmonary embolus', 'Émbolo pulmonar'),
        intro: text('Um pedaço solto do lado direito do coração. Entupiu o pulmão e tingiu tudo de verde.', 'A chunk broke off the right side of the heart. It lodged in the lung and stained it green.', 'Un pedazo suelto del lado derecho del corazón. Tapó el pulmón y lo tiñó de verde.'),
        trick: text('Espalha poça verde pelo chão, e pisar em cima come a sua vida.', 'It spreads green puddles on the floor, and standing in them drains your health.', 'Deja un charco verde en el suelo, y quedarse encima te come la vida.'),
        lesson: text(
            'A Pseudomonas aeruginosa fabrica piocianina, o pigmento que tinge a cultura de verde-azulado. Quando uma vegetação na válvula direita do coração se solta, o pedaço dispara pela artéria pulmonar. O pulmão é o primeiro filtro do caminho, e o bastão adora a umidade que encontra lá.',
            'Pseudomonas aeruginosa brews pyocyanin, the pigment that turns a lab culture blue-green. When a growth on the heart\'s right valve breaks loose, the chunk shoots down the pulmonary artery. The lung is the first filter in line, and this rod loves the damp home it finds there.',
            'La Pseudomonas aeruginosa fabrica piocianina, el pigmento que tiñe de verde el cultivo. Cuando una vegetación en la válvula derecha del corazón se desprende, el pedazo viaja por la arteria pulmonar. El pulmón filtra eso primero, y al bastón le encanta la humedad que encuentra ahí.',
        ),
    },
    {
        id: 'heart>brain', from: 'heart', to: 'brain', shape: 'grapes', play: 'embolus',
        color: '#f0c24a', accent: '#c9842a', hp: 1.05, speed: 0.38, radius: 110,
        short: text('S. AUREUS', 'S. AUREUS', 'S. AUREUS'),
        disease: text('Êmbolo séptico', 'Septic embolus', 'Émbolo séptico'),
        intro: text('Cachos dourados desgrudaram da válvula esquerda. Subiram pela carótida até o cérebro.', 'Golden clusters broke off the left valve. They shot up the carotid straight to the brain.', 'Racimos dorados se soltaron de la válvula izquierda. Subieron por la carótida al cerebro.'),
        trick: text('Dá um tranco feito êmbolo, avança de vez e espalha cocos pela arena.', 'It jolts forward like an embolus, surging ahead and scattering cocci.', 'Pega un tirón como un émbolo, avanza de golpe y esparce cocos.'),
        lesson: text(
            'O Staphylococcus aureus cresce amontoado feito cacho de uva, e o nome aureus vem do brilho dourado da colônia. Na endocardite do lado esquerdo do coração, pedaços da vegetação se soltam e disparam pelas carótidas. Cada fragmento é um êmbolo séptico que só para quando trava num vaso do cérebro.',
            'Staphylococcus aureus bunches up like a cluster of grapes, and aureus comes from the golden sheen of its colony. In left-sided endocarditis, chunks of vegetation break free and shoot up the carotids. Each fragment is a septic embolus that only stops when it jams a vessel in the brain.',
            'El Staphylococcus aureus se agrupa como un racimo de uvas, y aureus viene del tono dorado de su colonia. En la endocarditis del lado izquierdo, pedazos de la vegetación se sueltan y suben por las carótidas. Cada fragmento es un émbolo séptico que frena recién cuando tapa un vaso en el cerebro.',
        ),
    },
    {
        id: 'lung>molar', from: 'lung', to: 'molar', shape: 'broadBud', play: 'bud',
        color: '#e7d7c4', accent: '#8d6a48', hp: 1.1, speed: 0.3, radius: 104,
        short: text('B. DERMATITIDIS', 'B. DERMATITIDIS', 'B. DERMATITIDIS'),
        disease: text('Blastomicose', 'Blastomycosis', 'Blastomicosis'),
        intro: text('Entrou pelo pulmão com o ar. Depois se espalhou e abriu úlcera até na gengiva.', 'It rode the air into the lung. Then it spread out and opened an ulcer in the mouth.', 'Entró con el aire al pulmón. Después se esparció y abrió una úlcera en la boca.'),
        trick: text('Tem parede grossa que, quando racha, solta um broto largo e faz ele acelerar.', 'It has a thick wall that cracks to release a broad bud and make it speed up.', 'Tiene pared gruesa que, al rajarse, suelta un brote ancho y lo hace acelerar.'),
        lesson: text(
            'No tecido, o Blastomyces dermatitidis vira uma levedura de parede grossa que solta um broto de pescoço largo. É essa base larga que diferencia ele do Cryptococcus, que tem broto fino. A porta de entrada é sempre o pulmão, mas quando cai no sangue ele abre úlcera até na mucosa da boca.',
            'Inside tissue, Blastomyces dermatitidis turns into a thick-walled yeast with a broad-based bud. That wide neck sets it apart from Cryptococcus, which buds narrow. The front door is always the lung, but once it spreads through the blood, it carves ulcers right into the mouth.',
            'En el tejido, el Blastomyces dermatitidis es una levadura de pared gruesa con un brote de base ancha. Ese cuello ancho lo distingue del Cryptococcus, que brota angosto. La puerta de entrada es el pulmón, pero cuando se disemina por la sangre abre úlceras hasta en la boca.',
        ),
    },
    {
        id: 'lung>liver', from: 'lung', to: 'liver', shape: 'schisto', play: 'flagellum',
        color: '#c98b6a', accent: '#6a3030', hp: 0.95, speed: 0.42, radius: 114,
        short: text('S. MANSONI', 'S. MANSONI', 'S. MANSONI'),
        disease: text('Esquistossomose', 'Schistosomiasis', 'Esquistosomiasis'),
        intro: text('O verme jovem só usou o pulmão de passagem. A casa definitiva dele é a veia do fígado.', 'The young worm only used the lung as a hallway. Its real home is the vein by the liver.', 'El gusano joven solo usó el pulmón de paso. Su casa definitiva es la vena del hígado.'),
        trick: text('Nada em S preso nas ventosas sem mirar reto e, na metade da vida, o corte estala.', 'It swims in an S with its suckers without aiming straight, and at half health the cut snaps.', 'Nada en S con sus ventosas sin apuntar recto y, a la mitad de la vida, el corte estalla.'),
        lesson: text(
            'O Schistosoma mansoni fura a pele, vira esquistossômulo e precisa atravessar o pulmão no caminho. O endereço final é a veia porta, colada no fígado, onde o verme adulto amadurece e solta ovos. Aqui ele mostra corpo de verme, duas ventosas e uma cauda que ainda lembra a cercária.',
            'Schistosoma mansoni pierces the skin, turns into a schistosomulum, and has to cross the lung along the way. Its final address is the portal vein, right against the liver, where the adult sheds its eggs. Here it shows a worm body, two suckers, and a tail that still recalls the cercaria.',
            'El Schistosoma mansoni entra por la piel, se vuelve esquistosómulo y tiene que cruzar el pulmón en el camino. Su destino final es la vena porta, pegada al hígado, donde el adulto suelta los huevos. Aquí muestra cuerpo de gusano, dos ventosas y una cola que aún recuerda a la cercaria.',
        ),
    },
    {
        id: 'lung>heart', from: 'lung', to: 'heart', shape: 'cords', play: 'cord',
        color: '#e7d2a8', accent: '#8a7040', hp: 1.4, speed: 0.36, radius: 116,
        short: text('M. TUBERCULOSIS', 'M. TUBERCULOSIS', 'M. TUBERCULOSIS'),
        disease: text('Pericardite', 'Pericarditis', 'Pericarditis'),
        intro: text('Cordões de bacilos saíram do pulmão vizinho. Abraçaram o pericárdio e apertaram o coração.', 'Cords of bacilli crept from the neighboring lung. They wrapped the pericardium and squeezed the heart.', 'Cordones de bacilos pasaron desde el pulmón vecino. Envolvieron el pericardio y apretaron el corazón.'),
        trick: text('Gira no próprio eixo varrendo em volta, e chegar perto demais faz o cordão pegar você.', 'It spins on its axis sweeping all around, and getting too close lets the cord catch you.', 'Gira sobre su propio eje barriendo alrededor, y si te acercas de más el cordón te atrapa.'),
        lesson: text(
            'O Mycobacterium tuberculosis é um bastão fino com uma gordura na parede que faz a colônia crescer trançada em cordão, feito cobra. Do pulmão, a infecção avança no peito por continuidade até encostar no saco que envolve o coração. Essa pericardite tuberculosa aperta o músculo por fora.',
            'Mycobacterium tuberculosis is a slender rod with a waxy lipid in its wall that makes it grow braided into serpentine cords. From the lung, the infection creeps directly across into the sac around the heart. That tuberculous pericarditis squeezes the heart muscle from the outside.',
            'El Mycobacterium tuberculosis es un bastón fino con un lípido en la pared que lo hace crecer trenzado en cordón, como una serpiente. Desde el pulmón, la infección avanza por continuidad hasta tocar la bolsa que rodea al corazón. Esa pericarditis tuberculosa aprieta el músculo desde afuera.',
        ),
    },
    {
        id: 'lung>brain', from: 'lung', to: 'brain', shape: 'halo', play: 'capsule',
        color: '#f4f0ff', accent: '#c9b6ff', hp: 1.6, speed: 0.16, radius: 136,
        short: text('C. NEOFORMANS', 'C. NEOFORMANS', 'C. NEOFORMANS'),
        disease: text('Criptococose', 'Cryptococcosis', 'Criptococosis'),
        intro: text('Uma levedura de halo claro que entrou no fôlego. Saiu do pulmão e subiu até a meninge.', 'A haloed yeast breathed into the lung. It slipped into the blood and climbed to the meninges.', 'Una levadura con halo claro que entró con el aire. Salió del pulmón y subió hasta la meninge.'),
        trick: text('O halo é a cápsula que aguenta muita pancada e, às vezes, dispara um anel.', 'The halo is its capsule, soaking up heavy damage and sometimes firing a ring.', 'El halo es la cápsula que aguanta mucho castigo y, a veces, suelta un anillo.'),
        lesson: text(
            'O Cryptococcus neoformans entra no pulmão com o ar e vira uma levedura de broto estreito. No exame do líquor com tinta nanquim, ele brilha como um halo claro porque a cápsula grossa de polissacarídeo empurra a tinta para longe. Depois do pulmão, a parada famosa dele é a meninge.',
            'Cryptococcus neoformans rides the breath into the lung as a narrow-budding yeast. In spinal fluid stained with India ink, it shines with a bright halo because its thick polysaccharide capsule pushes the ink away. After the lung, its famous next stop is the brain\'s meninges.',
            'El Cryptococcus neoformans entra con la respiración al pulmón como una levadura de brote estrecho. En el líquido teñido con tinta china asoma un halo claro: la gruesa cápsula de polisacárido no deja pasar la tinta. Después del pulmón, su parada famosa es la meninge.',
        ),
    },
    {
        id: 'brain>molar', from: 'brain', to: 'molar', shape: 'envelope', play: 'reactivate',
        color: '#ffb7c8', accent: '#ffd6e4', hp: 0.9, speed: 0.3, radius: 96,
        short: text('HSV-1', 'HSV-1', 'HSV-1'),
        disease: text('Herpes labial', 'Cold sore', 'Herpes labial'),
        intro: text('Dormia escondido no gânglio do nervo. Acordou, desceu a trilha e abriu ferida na boca.', 'It slept hidden in the nerve ganglion. Now it woke up, walked the nerve down, and blistered the mouth.', 'Dormía escondido en el ganglio del nervio. Despertó, bajó por el cable y abrió herida en la boca.'),
        trick: text('Fica quieto acumulando força e, quando reativa, solta um anel de uma vez.', 'It sits quiet gathering strength and, when it reactivates, fires a ring all at once.', 'Se queda quieto juntando fuerza y, cuando se reactiva, suelta un anillo de golpe.'),
        lesson: text(
            'O HSV-1 entra pela boca e sobe pelo fio do nervo até o gânglio do trigêmeo, onde dorme a vida inteira. Quando acorda, faz o caminho de volta pelo mesmo nervo e reabre a ferida no lábio ou na gengiva. Por dentro, tem cápsula geométrica; por fora, veste um envelope mole.',
            'HSV-1 enters through the mouth and climbs the nerve wire up to the trigeminal ganglion, where it can sleep for a lifetime. When it wakes, it walks the exact same nerve back down to reopen a sore on the lip or gum. Inside sits a geometric shell; outside, a soft envelope.',
            'El HSV-1 entra por la boca y sube por el nervio hasta el ganglio del trigémino, donde duerme toda la vida. Cuando despierta, baja por el mismo nervio y reabre la herida en el labio o la encía. Por dentro tiene una cápsula geométrica; por fuera, una envoltura blanda.',
        ),
    },
    {
        id: 'brain>liver', from: 'brain', to: 'liver', shape: 'cyst', play: 'cyst',
        color: '#d5efe8', accent: '#f2fff8', hp: 1.45, speed: 0.2, radius: 124,
        short: text('T. SOLIUM', 'T. SOLIUM', 'T. SOLIUM'),
        disease: text('Cisticercose', 'Cysticercosis', 'Cisticercosis'),
        intro: text('Uma bolha d\'água com a cabeça do verme dentro. Morava no cérebro e espalhou até o fígado.', 'A water blister hiding a hooked worm head. It started in the brain and spread to the liver.', 'Una burbuja de agua con la cabeza del gusano adentro. Estaba en el cerebro y llegó al hígado.'),
        trick: text('A vesícula aguenta pancada até romper e soltar o escólex na correria.', 'The bladder absorbs hits until it bursts and sends the scolex sprinting out.', 'La vesícula aguanta el castigo hasta que se rompe y el escólex sale corriendo.'),
        lesson: text(
            'No tecido, a larva da Taenia solium vira um cisticerco: uma bolha d\'água guardando a cabeça do verme, o escólex, coroado de ganchos. O endereço mais famoso é o cérebro, na neurocisticercose, mas quando os cistos se espalham o fígado entra na roda. Quieto, é bolha; aberto, é cabeça.',
            'Inside tissue, the Taenia solium larva forms a cysticercus: a water blister hiding the worm\'s head, the scolex, armed with hooks. Its classic address is the brain in neurocysticercosis, but when cysts scatter, the liver makes the list. Quiet, it is a blister; broken open, a head.',
            'En el tejido, la larva de Taenia solium se vuelve cisticerco: una burbuja de agua que guarda la cabeza del gusano, el escólex, coronado de ganchos. El sitio clásico es el cerebro, en la neurocisticercosis, pero si los quistes se esparcen el hígado entra en la lista. Quieto, es burbuja; abierto, cabeza.',
        ),
    },
    {
        id: 'brain>heart', from: 'brain', to: 'heart', shape: 'crescent', play: 'crescent',
        color: '#b7e0ff', accent: '#4a7ea8', hp: 1, speed: 0.5, radius: 90,
        short: text('T. GONDII', 'T. GONDII', 'T. GONDII'),
        disease: text('Toxoplasmose', 'Toxoplasmosis', 'Toxoplasmosis'),
        intro: text('Um arco afiado que dormia num cisto do cérebro. Rompeu a casca e invadiu o coração.', 'A sharp crescent sleeping inside a brain cyst. It broke out and invaded the heart muscle.', 'Una medialuna afilada que dormía en el cerebro. Rompió el quiste e invadió el corazón.'),
        trick: text('Caça de lado soltando taquizoítos no bote e, na metade da vida, o cisto rompe e não para mais.', 'It hunts sideways shedding tachyzoites on the lunge, and at half health the cyst bursts nonstop.', 'Caza de lado soltando taquizoítos en el salto y, a la mitad de la vida, el quiste se rompe sin parar.'),
        lesson: text(
            'Na hora de invadir a célula, o Toxoplasma gondii tem feitio de meia-lua; o nome vem de toxon, que é arco. Ele mora quieto dentro de um cisto no cérebro. Quando a parede rompe, os taquizoítos despencam no sangue e vão ocupar outro músculo nobre: o coração.',
            'When it invades a cell, Toxoplasma gondii is shaped like a crescent; its name comes from toxon, meaning bow. It waits quietly inside a cyst in the brain. When that wall ruptures, tachyzoites spill into the blood and move in on another prime muscle: the heart.',
            'A la hora de invadir, el Toxoplasma gondii tiene forma de medialuna; su nombre viene de toxon, que significa arco. Vive quieto dentro de un quiste en el cerebro. Cuando esa pared se rompe, los taquizoítos caen a la sangre y ocupan otro músculo clave: el corazón.',
        ),
    },
    {
        id: 'brain>lung', from: 'brain', to: 'lung', shape: 'coil', play: 'coil',
        color: '#e0b48a', accent: '#8a5a32', hp: 1.1, speed: 0.36, radius: 108,
        short: text('A. CANTONENSIS', 'A. CANTONENSIS', 'A. CANTONENSIS'),
        disease: text('Angiostrongilíase', 'Angiostrongyliasis', 'Angiostrongiliasis'),
        intro: text('A larva perdeu o rumo e subiu para o cérebro. A sala seguinte é o pulmão que ela procurava.', 'The larva took a wrong turn into the brain. The next room is the lung it was looking for.', 'La larva equivocó el camino y subió al cerebro. La sala siguiente es el pulmón que buscaba.'),
        trick: text('Enrola o corpo em volta de você num anel que aperta, afrouxa e torna a apertar.', 'It coils around you in a loop that tightens, loosens, and tightens again.', 'Se enrolla a tu alrededor en un círculo que aprieta, afloja y vuelve a apretar.'),
        lesson: text(
            'O Angiostrongylus cantonensis é o verme do pulmão do rato, onde o adulto mora dentro da artéria pulmonar. Em gente, a larva erra a curva no caminho e para no cérebro, abrindo uma meningite eosinofílica. Nesta porta, a sala seguinte é justamente o endereço que ela queria desde o início.',
            'Angiostrongylus cantonensis is the rat lungworm, whose adult lives inside the pulmonary artery. In humans, the larva misses its turn and climbs to the brain, causing eosinophilic meningitis. Through this door, the next room is the exact address it was trying to reach all along.',
            'El Angiostrongylus cantonensis es el gusano del pulmón de la rata, donde el adulto vive en la arteria pulmonar. En las personas, la larva se equivoca de ruta y sube al cerebro, causando meningitis eosinofílica. En este viaje, la sala siguiente es la dirección que buscaba desde el principio.',
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
        veil: 0,
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
