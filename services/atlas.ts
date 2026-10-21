import { Language, OrganId } from '../types';

const BODY: Record<Language, Record<string, string>> = {
    PT: {
        vital: 'Você é o que ainda responde. Um corpo claro, miolo aceso, entrando onde a infecção já sentou. Enquanto esse miolo pulsa, tem jogo.',
        bacteria: 'Bactéria não escolhe alvo. Ela acha comida, encosta, e se parte em duas. Por isso anda reto: quem se multiplica nesse ritmo não precisa de plano, precisa de espaço.',
        virus: 'Vírus não tem perna. Ele invade uma célula, senta no comando e manda a célula fabricar cópias. Na tela ele fica parado e cospe espinho, porque o ataque sai da célula que ele tomou.',
        fungi: 'Fungo cresce em fio. O fio vai, bate numa parede, dobra, tenta de novo. O zigue-zague não é pressa. É um bicho que só sabe tatear.',
        parasite: 'Tem parasita que vive de ser difícil de matar. Parede grossa, pressa nenhuma, e um tiro só vira coceira. Você gasta munição. Ele gasta o seu tempo.',
        boss: 'No fim do órgão a infecção para de ser vários pontinhos e vira uma coisa só. Não é um convidado novo. É o próprio órgão, já tomado, ocupando a sala inteira.',
        plaque: 'Placa é bactéria com endereço fixo. Elas se colam com um açúcar e o dente vira chão ácido. Ficar em cima é emprestar o esmalte. A saliva passa e desfaz a cola.',
        saliva: 'Saliva não é água. Tem enzima, tem bicarbonato, tem o costume de lavar o que grudou no dente. Aqui ela limpa a placa, te carrega um trecho e ainda deixa uma película. Por um instante o dano chega pela metade.',
        bite: 'Morder é isto: duas paredes duras concordam em se encontrar, e o que estava no meio deixa de estar. A faixa avisa antes. Quem fica, conhece o esmalte por dentro.',
        enamel: 'Esmalte é o tecido mais duro que você tem, e mesmo assim a cárie abre caminho. Pegar essa película é vestir um pedaço dele. O golpe chega, mas perde metade da força na porta.',
        bile: 'Bile é o detergente do fígado, feito para quebrar gordura dentro do intestino. Fora do cano, ela não distingue gordura de membrana. A poça queima porque suco digestivo não devia estar no chão.',
        filter: 'O fígado recebe o sangue que veio da barriga e tenta limpar antes de devolver ao corpo. Quando o filtro entope, tudo é puxado para um ponto e espremido. Quem chega no centro paga a conta.',
        heal: 'Fígado guarda glicogênio, açúcar deixado de lado para a hora feia. A gota dourada é um naco desse estoque. Por uns segundos o corpo lembra como se remenda.',
        beat: 'Sístole é o coração fechando o punho. O sangue sai empurrado, e você sente isso no pescoço quando sobe uma escada. Aqui o aperto te acelera e a corrente vai junto.',
        ecg: 'O eletrocardiograma desenha a ordem elétrica que manda o músculo fechar. Não é o sangue. É o recado. A linha que corta a faixa é esse recado passando, e ficar nela é ficar no fio.',
        clot: 'Coágulo é sangue que resolveu virar tampão. Serve numa ferida. Dentro da veia, vira uma rolha que desce com a corrente. Ele se forma devagar e depois não pede licença.',
        gust: 'O pulmão não sopra o tempo todo. Enche, segura, solta. A lufada é a solta, e os fios mostram para onde o ar decidiu ir. Discutir com isso é discutir com o diafragma.',
        cough: 'Tosse é um reflexo com três tempos: fecha, aperta, abre de uma vez. O corpo faz isso para botar para fora o que não devia estar no cano. A faixa aperta antes. Quando estoura, varre.',
        oxygen: 'Célula queima açúcar com oxigênio. Sem ele, o músculo responde tarde. Com um pouco a mais no sangue, o Vital dispara antes. Por isso a cadência sobe: por um instante, a respiração está do seu lado.',
        synapse: 'Neurônio não encosta no vizinho. Entre os dois tem uma fresta, e o sinal pula em forma de química. O raio é esse pulo. O branco é um pulo alto demais, e a tela inteira leva o estalo.',
        focus: 'Dopamina é o cérebro marcando o que valeu a pena. Com ela alta, o tiro acha o ponto fraco mais vezes. Não virou sorte. O sistema de recompensa te emprestou um pouco de mira.',
        dash: 'Desvio é um tranco curto, o corpo inteiro saindo da linha do golpe. Nesse piscar, o inimigo acerta o lugar onde você estava. Não é escudo. É você não estar mais ali.',
        surge: 'Pulso é uma onda saindo de você. O que está perto é empurrado, e o DNA solto, leve, volta para o centro. Membrana de célula faz parentesco disso o dia inteiro: joga o que não serve e puxa o que presta.',
    },
    EN: {
        vital: 'You are whatever still answers. A pale body, core lit, walking in where the infection already sat down. As long as that core pulses, the round is alive.',
        bacteria: 'A bacterium does not pick a target. It finds food, presses in, and splits in two. That is why it walks straight. At that pace you do not need a plan. You need room.',
        virus: 'A virus has no legs. It moves into a cell, takes the desk, and has the cell print copies. On screen it stays put and spits spikes, because the attack comes out of the cell it took.',
        fungi: 'Fungus grows as a thread. The thread goes, hits a wall, bends, tries again. The zig-zag is not hurry. It is a creature that only knows how to feel its way.',
        parasite: 'Some parasites live by being hard to kill. Thick wall, no hurry, and one shot is an itch. You spend ammunition. It spends your time.',
        boss: 'At the end of an organ the infection stops being a lot of specks and becomes one thing. It is not a new guest. It is the organ itself, already taken, filling the room.',
        plaque: 'Plaque is bacteria with a fixed address. They glue themselves down with a sugar and the tooth turns into acid floor. Standing on it is lending them enamel. Saliva comes through and undoes the glue.',
        saliva: 'Saliva is not water. It has enzyme, bicarbonate, and the habit of washing whatever stuck to the tooth. Here it clears plaque, carries you a stretch, and leaves a film. For a moment damage arrives at half strength.',
        bite: 'A bite is two hard walls agreeing to meet, and whatever was between them is not there anymore. The band warns you first. Stay, and you learn the enamel from the inside.',
        enamel: 'Enamel is the hardest tissue you have, and decay still finds a way through. Picking up that film is wearing a piece of it. The hit arrives, and loses half its force at the door.',
        bile: 'Bile is the liver’s detergent, made to break fat inside the gut. Outside the duct it cannot tell fat from a cell membrane. The puddle burns because digestive juice had no business on the floor.',
        filter: 'The liver takes the blood that came up from the belly and tries to clean it before handing it back. When the filter clogs, everything is pulled to one point and squeezed. Whoever reaches the center pays.',
        heal: 'The liver keeps glycogen, sugar set aside for the ugly hour. The gold drop is a lump of that store. For a few seconds the body remembers how to patch itself.',
        beat: 'Systole is the heart closing its fist. Blood leaves under pressure, and you feel it in the neck on a flight of stairs. Here the squeeze speeds you up and the current goes with you.',
        ecg: 'The electrocardiogram draws the electrical order that tells the muscle to close. It is not the blood. It is the message. The line crossing the band is that message going by, and standing on it is standing on the wire.',
        clot: 'A clot is blood that decided to become a plug. Useful on a cut. Inside a vein it is a stopper that rides the current. It forms slowly, and then it does not ask.',
        gust: 'A lung does not blow the whole time. It fills, holds, lets go. The gust is the letting go, and the strands show where the air decided to travel. Arguing with that is arguing with the diaphragm.',
        cough: 'A cough is a reflex in three beats: close, squeeze, open all at once. The body does it to throw out whatever should not be in the pipe. The band tightens first. When it bursts, it sweeps.',
        oxygen: 'A cell burns sugar with oxygen. Without it, muscle answers late. With a little extra in the blood, Vital fires sooner. That is why the cadence climbs. For a moment, breathing is on your side.',
        synapse: 'A neuron does not touch its neighbor. There is a gap, and the signal jumps it as chemistry. The bolt is that jump. The white one is a jump too loud, and the whole screen takes the snap.',
        focus: 'Dopamine is the brain marking what was worth it. With it high, the shot finds the weak spot more often. It did not become luck. The reward system lent you a little aim.',
        dash: 'A dash is a short jerk, the whole body leaving the line of the hit. In that blink the enemy strikes where you were. It is not a shield. It is you not being there.',
        surge: 'The pulse is a wave leaving you. What is close gets shoved, and loose DNA, being light, comes back to the center. A cell membrane does a cousin of this all day: throws out what is useless and pulls in what is worth keeping.',
    },
    ES: {
        vital: 'Tú eres lo que todavía contesta. Un cuerpo claro, núcleo encendido, entrando donde la infección ya se sentó. Mientras ese núcleo late, hay partida.',
        bacteria: 'Una bacteria no elige blanco. Encuentra comida, se pega y se parte en dos. Por eso camina recto: a ese ritmo no hace falta un plan, hace falta sitio.',
        virus: 'Un virus no tiene pierna. Entra en una célula, se sienta al mando y le ordena fabricar copias. En la pantalla se queda quieto y escupe púas, porque el ataque sale de la célula que tomó.',
        fungi: 'El hongo crece en hilo. El hilo avanza, choca con una pared, dobla, prueba otra vez. El zigzag no es prisa. Es un bicho que solo sabe tantear.',
        parasite: 'Hay parásitos que viven de ser difíciles de matar. Pared gruesa, ninguna prisa, y un tiro es un picor. Tú gastas munición. Él gasta tu tiempo.',
        boss: 'Al final del órgano la infección deja de ser muchos puntitos y se vuelve una sola cosa. No es un invitado nuevo. Es el propio órgano, ya tomado, ocupando la sala.',
        plaque: 'La placa es bacteria con domicilio fijo. Se pegan con un azúcar y el diente se vuelve suelo ácido. Quedarse encima es prestarles esmalte. La saliva pasa y deshace el pegamento.',
        saliva: 'La saliva no es agua. Tiene enzima, bicarbonato y la costumbre de lavar lo que se pegó al diente. Aquí limpia la placa, te lleva un trecho y deja una película. Por un instante el daño llega a la mitad.',
        bite: 'Morder es esto: dos paredes duras acuerdan encontrarse, y lo que estaba en el medio deja de estar. La franja avisa antes. Quien se queda conoce el esmalte por dentro.',
        enamel: 'El esmalte es el tejido más duro que tienes, y aun así la caries se abre paso. Tomar esa película es vestir un pedazo de él. El golpe llega, pero pierde la mitad de la fuerza en la puerta.',
        bile: 'La bilis es el detergente del hígado, hecho para romper grasa dentro del intestino. Fuera del conducto no distingue grasa de membrana. El charco quema porque el jugo digestivo no tenía nada que hacer en el suelo.',
        filter: 'El hígado recibe la sangre que subió de la barriga y trata de limpiarla antes de devolverla. Cuando el filtro se tapa, todo es jalado a un punto y exprimido. Quien llega al centro paga.',
        heal: 'El hígado guarda glucógeno, azúcar apartado para la hora fea. La gota dorada es un trozo de esa reserva. Por unos segundos el cuerpo recuerda cómo se remienda.',
        beat: 'La sístole es el corazón cerrando el puño. La sangre sale empujada, y eso se siente en el cuello al subir una escalera. Aquí el apretón te acelera y la corriente va contigo.',
        ecg: 'El electrocardiograma dibuja la orden eléctrica que manda cerrar el músculo. No es la sangre. Es el recado. La línea que cruza la franja es ese recado pasando, y quedarse ahí es quedarse en el cable.',
        clot: 'Un coágulo es sangre que decidió volverse tapón. Sirve en una herida. Dentro de la vena es un corcho que baja con la corriente. Se forma despacio y después no pide permiso.',
        gust: 'El pulmón no sopla todo el tiempo. Se llena, aguanta, suelta. La ráfaga es la soltada, y los hilos muestran hacia dónde decidió ir el aire. Discutir con eso es discutir con el diafragma.',
        cough: 'La tos es un reflejo en tres tiempos: cierra, aprieta, abre de una vez. El cuerpo lo hace para echar lo que no debía estar en el tubo. La franja aprieta antes. Cuando estalla, barre.',
        oxygen: 'La célula quema azúcar con oxígeno. Sin él, el músculo responde tarde. Con un poco más en la sangre, Vital dispara antes. Por eso sube la cadencia: por un instante, la respiración está de tu lado.',
        synapse: 'Una neurona no toca a la vecina. Entre las dos hay una rendija, y la señal salta en forma de química. El rayo es ese salto. El blanco es un salto demasiado alto, y la pantalla entera se lleva el chasquido.',
        focus: 'La dopamina es el cerebro marcando lo que valió la pena. Con ella alta, el tiro encuentra el punto débil más seguido. No se volvió suerte. El sistema de recompensa te prestó un poco de puntería.',
        dash: 'El esquive es un tirón corto, el cuerpo entero saliendo de la línea del golpe. En ese parpadeo el enemigo pega donde estabas. No es un escudo. Es que tú ya no estás ahí.',
        surge: 'El pulso es una onda que sale de ti. Lo que está cerca es empujado, y el ADN suelto, liviano, vuelve al centro. La membrana de una célula hace un pariente de esto todo el día: echa lo que no sirve y jala lo que presta.',
    },
};

const HOP: Record<Language, Record<string, string>> = {
    PT: {
        'molar>liver': 'O sangue que drena a barriga também carrega o que a boca deixa escapar. Bactéria de gengiva entra nessa veia e a primeira estação grande é o fígado, que filtra tudo o que veio de baixo. Um molar podre, às vezes, dá as caras primeiro como fígado doente.',
        'molar>heart': 'A boca infectada solta bactéria no sangue o tempo todo, em silêncio. Esse sangue passa pelo coração antes de ir a qualquer outro lugar, e a válvula é um canto bom para a colônia sentar. Endocardite costuma começar numa cadeira de dentista que ninguém levou a sério.',
        'molar>lung': 'A gente engole errado mais do que admite. Secreção da boca desce pelo lugar do ar, não pelo da comida, e cai no alvéolo. O pulmão não tem como cuspir de volta. Vira pneumonia de quem dormiu com a boca cheia.',
        'molar>brain': 'Tem uma veia na cara, sem válvula, que sobe da boca para dentro do crânio. Abscesso de molar pode escalar por ela como quem sobe um cano. O cérebro fica logo ali, sem porta de verdade.',
        'liver>molar': 'Bile devia descer para o intestino e ficar lá. Quando o fígado regurgita, o suco sobe, queima a mucosa e reabre gengiva que já estava mal. O dente não adoece sozinho. A bile volta e termina o serviço.',
        'liver>heart': 'Fígado congesto segura sangue que o coração queria de volta. O átrio enche demais, trabalha torto, e o que era problema de filtro vira problema de bomba. Um órgão entope. O outro paga a hora extra.',
        'liver>lung': 'Fígado que falha para de segurar o líquido no lugar certo. O fluido sobe, atravessa e alaga o alvéolo, que era para ter ar. A pessoa afoga por dentro, sem ver a água.',
        'liver>brain': 'Fígado quebrado não limpa a amônia. Ela segue no sangue, atravessa a barreira que devia proteger o cérebro, e o pensamento fica turvo. Não é loucura. É sujeira química que não foi recolhida.',
        'heart>molar': 'Coração com bactéria na válvula devolve essa bactéria para o corpo inteiro a cada batida. A gengiva, cheia de vaso fino, é um canteiro fácil. O molar floresce de novo porque o sangue não parou de semear.',
        'heart>liver': 'O fígado vive do sangue que o coração manda. Se o débito cai, o lóbulo fica sem oxigênio e começa a morrer de fora para dentro. Isquemia é isso: o filtro apaga porque a bomba cansou.',
        'heart>lung': 'Quando o ventrículo esquerdo não dá conta, o sangue volta para trás e enche o pulmão. O ar perde o lugar. Edema de pulmão é o coração falhando em voz alta, com espuma.',
        'heart>brain': 'Um coágulo que nasce no coração tem um caminho curto e largo: a carótida sobe, e o cérebro está no fim dela. O êmbolo não infecta. Ele fecha a rua. Do outro lado, o tecido apaga.',
        'lung>molar': 'Tosse crônica resseca a boca. Sem saliva bastante, a mucosa racha e a bactéria entra onde o esmalte já estava cansado. O pulmão, de tanto expulsar ar, abre um molar lá em cima.',
        'lung>liver': 'Fígado também precisa de oxigênio para fazer o trabalho sujo. Pulmão ruim entrega sangue azul, e o lóbulo apanha em silêncio. Hipoxemia não fica no peito. Ela desce e maltrata quem filtra.',
        'lung>heart': 'Oxigênio baixo obriga o coração a bater mais forte para entregar o mesmo. O ventrículo direito, que empurra sangue para o pulmão, é o primeiro a estourar. A falta de ar vira falta de bomba.',
        'lung>brain': 'Pulmão que não troca gás deixa o carbônico subir. O cérebro é guloso e mal-humorado com isso: escurece, a atenção cai, a pessoa apaga. Não foi um golpe. Foi o ar que não voltou.',
        'brain>molar': 'Estresse noturno range dente. O esmalte racha em linha fina, a bactéria acha a fresta, e o molar que estava inteiro de dia acorda infectado. O cérebro mordeu no escuro.',
        'brain>liver': 'O fígado obedece ordem nervosa o dia inteiro, no ritmo do metabolismo. Quando esse eixo cai, ele para de guardar e de limpar no compasso certo. Não houve veneno. Houve um comando que não chegou.',
        'brain>heart': 'O coração não decide sozinho a pressa. O sistema autônomo manda. Numa tempestade dessas, o acelerador trava fundo e o músculo dispara sem ninguém ter corrido. O susto é químico, e o peito acredita.',
        'brain>lung': 'Quem manda o diafragma descer mora no tronco cerebral. Se esse comando some, o pulmão está cheio, vazio ou parado, tanto faz: ninguém pediu o próximo ar. A respiração não cansa. Ela esquece.',
    },
    EN: {
        'molar>liver': 'The vein that drains the belly also carries whatever the mouth lets slip. Gum bacteria enter that blood and the first big station is the liver, which filters everything that came from below. A rotten molar sometimes shows up first as a sick liver.',
        'molar>heart': 'An infected mouth leaks bacteria into the blood all day, quietly. That blood crosses the heart before it goes anywhere else, and a valve is a fine corner for a colony to sit. Endocarditis often starts in a dental chair nobody took seriously.',
        'molar>lung': 'People swallow wrong more often than they admit. Mouth secretion goes down the air’s road, not the food’s, and lands in an alveolus. The lung cannot spit it back. It becomes the pneumonia of someone who slept with a full mouth.',
        'molar>brain': 'There is a vein in the face, with no valve, that climbs from the mouth into the skull. A molar abscess can scale it like a pipe. The brain is right there, without a real door.',
        'liver>molar': 'Bile is supposed to go down into the gut and stay there. When the liver sends it back, the juice climbs, burns the mucosa, and reopens a gum that was already in trouble. The tooth does not get sick alone. The bile returns and finishes the job.',
        'liver>heart': 'A congested liver holds blood the heart wanted returned. The atrium overfills, works crooked, and a filter problem becomes a pump problem. One organ clogs. The other pays the overtime.',
        'liver>lung': 'A failing liver stops keeping fluid where it belongs. The water rises, crosses, and floods the alveolus, which was meant to hold air. The person drowns on the inside, without seeing the water.',
        'liver>brain': 'A broken liver does not clear ammonia. It stays in the blood, crosses the barrier that was supposed to protect the brain, and thought goes cloudy. It is not madness. It is chemical dirt nobody picked up.',
        'heart>molar': 'A heart with bacteria on a valve hands that bacteria back to the whole body with every beat. The gum, full of fine vessels, is an easy bed. The molar blooms again because the blood never stopped sowing.',
        'heart>liver': 'The liver lives on the blood the heart sends. If output falls, the lobule runs out of oxygen and starts to die from the outside in. Ischemia is that: the filter goes dark because the pump got tired.',
        'heart>lung': 'When the left ventricle cannot keep up, blood backs up and fills the lung. Air loses its seat. Pulmonary edema is the heart failing out loud, with foam.',
        'heart>brain': 'A clot born in the heart has a short, wide road: the carotid climbs, and the brain is at the end of it. The embolus does not infect. It closes the street. On the far side, tissue goes out.',
        'lung>molar': 'A chronic cough dries the mouth. Without enough saliva the mucosa cracks, and bacteria walk into enamel that was already tired. The lung, from pushing air out so long, opens a molar upstairs.',
        'lung>liver': 'The liver needs oxygen too, if it is going to do the dirty work. A bad lung delivers blue blood, and the lobule takes the hit in silence. Hypoxemia does not stay in the chest. It goes down and batters whoever filters.',
        'lung>heart': 'Low oxygen forces the heart to beat harder to deliver the same amount. The right ventricle, which pushes blood toward the lung, is the first to blow. Shortness of breath turns into shortness of pump.',
        'lung>brain': 'A lung that does not trade gas lets carbon dioxide rise. The brain is greedy and ill-tempered about that: it dims, attention drops, the person blacks out. It was not a blow. It was air that did not come back.',
        'brain>molar': 'Night stress grinds teeth. Enamel cracks in a hairline, bacteria find the gap, and a molar that was whole by day wakes up infected. The brain bit in the dark.',
        'brain>liver': 'The liver takes nervous orders all day, on the clock of metabolism. When that axis drops, it stops storing and cleaning on time. There was no poison. There was an order that never arrived.',
        'brain>heart': 'The heart does not choose its own hurry. The autonomic system does. In a storm like that the accelerator sticks down and the muscle fires though nobody ran. The fright is chemical, and the chest believes it.',
        'brain>lung': 'Whoever tells the diaphragm to drop lives in the brainstem. If that order vanishes, the lung can be full, empty, or still: nobody asked for the next breath. Breathing does not get tired. It forgets.',
    },
    ES: {
        'molar>liver': 'La vena que drena la barriga también carga lo que la boca deja escapar. La bacteria de la encía entra en esa sangre y la primera estación grande es el hígado, que filtra todo lo que vino de abajo. Un molar podrido, a veces, aparece primero como hígado enfermo.',
        'molar>heart': 'La boca infectada suelta bacteria en la sangre todo el día, en silencio. Esa sangre pasa por el corazón antes de ir a cualquier otro sitio, y la válvula es un rincón bueno para que la colonia se siente. La endocarditis suele empezar en un sillón de dentista que nadie tomó en serio.',
        'molar>lung': 'Uno traga mal más de lo que admite. La secreción de la boca baja por el camino del aire, no por el de la comida, y cae en el alvéolo. El pulmón no puede devolverla. Se vuelve la neumonía de quien se durmió con la boca llena.',
        'molar>brain': 'Hay una vena en la cara, sin válvula, que sube de la boca al cráneo. Un absceso de molar puede trepar por ella como por un tubo. El cerebro está ahí mismo, sin una puerta de verdad.',
        'liver>molar': 'La bilis debía bajar al intestino y quedarse ahí. Cuando el hígado la devuelve, el jugo sube, quema la mucosa y reabre una encía que ya estaba mal. El diente no enferma solo. La bilis vuelve y termina el trabajo.',
        'liver>heart': 'Un hígado congestionado retiene sangre que el corazón quería de vuelta. La aurícula se llena de más, trabaja torcida, y un problema de filtro se vuelve problema de bomba. Un órgano se tapa. El otro paga la hora extra.',
        'liver>lung': 'Un hígado que falla deja de sujetar el líquido en su sitio. El agua sube, cruza y alaga el alvéolo, que era para tener aire. La persona se ahoga por dentro, sin ver el agua.',
        'liver>brain': 'Un hígado roto no limpia el amoníaco. Sigue en la sangre, cruza la barrera que debía proteger el cerebro, y el pensamiento se pone turbio. No es locura. Es suciedad química que nadie recogió.',
        'heart>molar': 'Un corazón con bacteria en la válvula se la devuelve al cuerpo entero en cada latido. La encía, llena de vasos finos, es un cantero fácil. El molar florece otra vez porque la sangre no dejó de sembrar.',
        'heart>liver': 'El hígado vive de la sangre que manda el corazón. Si el gasto cae, el lóbulo se queda sin oxígeno y empieza a morir de afuera hacia adentro. Isquemia es eso: el filtro se apaga porque la bomba se cansó.',
        'heart>lung': 'Cuando el ventrículo izquierdo no da abasto, la sangre retrocede y llena el pulmón. El aire pierde el sitio. El edema de pulmón es el corazón fallando en voz alta, con espuma.',
        'heart>brain': 'Un coágulo que nace en el corazón tiene un camino corto y ancho: la carótida sube, y el cerebro está al final. El émbolo no infecta. Cierra la calle. Del otro lado, el tejido se apaga.',
        'lung>molar': 'La tos crónica seca la boca. Sin bastante saliva la mucosa se raja y la bacteria entra donde el esmalte ya estaba cansado. El pulmón, de tanto echar aire, abre un molar allá arriba.',
        'lung>liver': 'El hígado también necesita oxígeno para hacer el trabajo sucio. Un pulmón malo entrega sangre azul, y el lóbulo se lleva el golpe en silencio. La hipoxemia no se queda en el pecho. Baja y maltrata a quien filtra.',
        'lung>heart': 'El oxígeno bajo obliga al corazón a latir más fuerte para entregar lo mismo. El ventrículo derecho, que empuja sangre hacia el pulmón, es el primero en reventar. La falta de aire se vuelve falta de bomba.',
        'lung>brain': 'Un pulmón que no cambia el gas deja subir el carbónico. El cerebro es glotón y de mal humor con eso: se oscurece, la atención cae, la persona se apaga. No fue un golpe. Fue el aire que no volvió.',
        'brain>molar': 'El estrés de la noche rechina los dientes. El esmalte se raja en una línea fina, la bacteria encuentra la rendija, y un molar que de día estaba entero amanece infectado. El cerebro mordió en la oscuridad.',
        'brain>liver': 'El hígado obedece órdenes nerviosas todo el día, al ritmo del metabolismo. Cuando ese eje cae, deja de guardar y de limpiar a tiempo. No hubo veneno. Hubo una orden que no llegó.',
        'brain>heart': 'El corazón no decide solo su prisa. Manda el sistema autónomo. En una tormenta así el acelerador se traba a fondo y el músculo dispara aunque nadie haya corrido. El susto es químico, y el pecho se lo cree.',
        'brain>lung': 'Quien manda bajar al diafragma vive en el tronco cerebral. Si esa orden desaparece, el pulmón puede estar lleno, vacío o quieto: nadie pidió el siguiente aire. La respiración no se cansa. Se olvida.',
    },
};

export function bodyNote(kind: string, lang: Language): string {
    return BODY[lang]?.[kind] || BODY.EN[kind] || '';
}

export function hopNote(from: OrganId, to: OrganId, lang: Language): string {
    const key = `${from}>${to}`;
    return HOP[lang]?.[key] || HOP.EN[key] || '';
}

export function crossingTitle(lang: Language): string {
    if (lang === 'PT') return 'DE UM ÓRGÃO AO OUTRO';
    if (lang === 'ES') return 'DE UN ÓRGANO AL OTRO';
    return 'FROM ONE ORGAN TO THE NEXT';
}

export function tapHint(lang: Language): string {
    if (lang === 'PT') return 'Toca uma ficha.';
    if (lang === 'ES') return 'Toca una ficha.';
    return 'Tap a card.';
}

export function sheetKicker(lang: Language): string {
    if (lang === 'PT') return 'NO CORPO';
    if (lang === 'ES') return 'EN EL CUERPO';
    return 'IN THE BODY';
}

export function closeLabel(lang: Language): string {
    if (lang === 'PT') return 'FECHAR';
    if (lang === 'ES') return 'CERRAR';
    return 'CLOSE';
}
