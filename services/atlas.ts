import { Language, OrganId } from '../types';

const BODY: Record<Language, Record<string, string>> = {
    PT: {
        vital: 'Você pilota o corpo claro. O miolo aceso é a vida: enquanto pulsa, a partida segue. Se a vida cai demais, o tempo segura por um instante. Essa folga acaba, e o ritmo volta ao normal.',
        bacteria: 'A bactéria entra pela direita e segue quase em linha reta. Não mira, não se parte, não chama outra. Continua uma só até o tiro acabar com ela. O perigo é o contato: deixou encostar, a vida desce.',
        virus: 'O vírus quase não anda. Fica no fundo e, de alguns em alguns segundos, cospe um espinho na sua direção. Perto de você o espinho curva um pouco. Ele aguenta tiro e quase não recua.',
        fungi: 'O fungo é leve e rápido, com pouca vida. O contato dói, e o caminho não é reto: sobe e desce em zigue-zague. Acerta cedo. Se ele chegou perto, já passou.',
        parasite: 'O parasita atravessa devagar e ocupa espaço. A vida é alta, e cada tiro perde um pedaço antes de entrar. Enquanto você gasta munição, ele rouba o tempo. O contato dói muito.',
        boss: 'Na última onda de cada órgão aparece o organismo que abre a sala seguinte. São vinte, um para cada viagem. O nome, o caminho e o truque estão na ficha de cada chefe.',
        plaque: 'Placa é mancha parada no molar. Pisar nela come a vida aos poucos e deixa o passo pesado. Não atira. Só espera. Quando a saliva passa por cima, a mancha se desfaz.',
        saliva: 'A saliva cruza o molar em fita, molhada, com o nome escrito dentro. Onde ela passa, a placa se dissolve. Se você está no fio, ela te leva junto e, por um instante, o dano que chega fica mais fraco.',
        bite: 'Primeiro a faixa acende e as mandíbulas se aproximam. Dá tempo de sair. O golpe, e o barulho, acontecem quando as duas paredes se encontram. Quem ficou no meio é esmagado. Quem saiu da faixa, não.',
        enamel: 'O esmalte é uma gota clara no molar. Pegar veste uma película: por alguns segundos, todo golpe que te acerta chega com metade da força. Acabou o tempo, acabou a película.',
        bile: 'A bile abre uma poça no chão do fígado e fica lá. Não persegue. Quem permanece dentro vai queimando, aos poucos. Saiu da poça, o dano para. O chão é o perigo.',
        filter: 'No fígado está escrito coador — puxa. Ele acende e puxa o que está solto para o centro: você, bactéria, fungo, vírus, DNA. Quem chega espremido no meio leva dano. Saia antes.',
        heal: 'Na gota dourada está escrito açúcar — cura. É o que o fígado guarda. Pegar não enche a vida de uma vez. Por uns segundos o corpo vai se remendando, devagar. Passou o tempo, acabou.',
        beat: 'A cada batida o coração empurra a corrente para o lado e te dá um tranco curto de velocidade. Você anda um pouco mais rápido, e o que está solto vai junto. É o compasso da sala.',
        ecg: 'Uma linha de batimento atravessa uma faixa. Encostar nela machuca. Ela passa e vai embora. O erro é ficar no caminho.',
        clot: 'O coágulo nasce parado, cresce, e só então se solta e desce com o sangue. Enquanto está se formando, dá para sair. Depois que solta, quem encosta leva o tranco. Ele não volta.',
        gust: 'A lufada atravessa o pulmão numa faixa. Os fios mostram para onde o ar empurra. Não tira vida por si: desloca quem está na faixa. Brigar com a direção é perder o lugar.',
        cough: 'A tosse avisa numa faixa, aperta, e estoura. Quem ficou dentro é varrido e perde um naco grande de vida. Inimigo que estava na faixa some no sopro. A hora de sair é antes do estouro.',
        oxygen: 'A molécula clara do pulmão acelera o seu tiro. Por alguns segundos os disparos saem mais seguidos. Não aumenta o dano de cada um. Aumenta a cadência. Acabou, o intervalo volta ao normal.',
        synapse: 'Um raio liga dois pontos e machuca quem está na linha, você ou inimigo. O raio branco estoura a tela no mesmo golpe. Passa rápido, e dói.',
        focus: 'A gota violeta sobe a chance de crítico por alguns segundos. O tiro comum continua igual. O que muda é a frequência com que ele acha o ponto fraco. Acabou o tempo, a mira extra vai embora.',
        dash: 'O desvio é um tranco curto na direção em que você está indo. Nesse piscar, o dano não entra. A janela é pequena. Depois tem espera até poder de novo.',
        surge: 'O pulso gasta a energia e solta uma onda. Quem leva o choque trava um instante, com faísca. Outra parte é empurrada e continua na tela. Tem quem resiste. O DNA solto volta pra você. Chefe aguenta o tranco.',
    },
    EN: {
        vital: 'You pilot the pale body. The lit core is your health: while it pulses, the round goes on. If health drops too far, time holds for a moment. That slack ends, and the pace comes back.',
        bacteria: 'Bacteria come in from the right and travel almost straight. They do not aim, they do not split, they do not call another. One stays one until a shot ends it. The danger is contact. Let it touch you and health drops.',
        virus: 'A virus barely moves. It hangs back and, every few seconds, spits a spike toward you. Close in, the spike bends a little. It soaks shots and barely gets pushed.',
        fungi: 'Fungus is light and fast, with little health. Contact hurts, and the path is not straight: it rises and falls in a zig-zag. Hit it early. If it got close, it already went by.',
        parasite: 'A parasite crosses slowly and takes up space. Its health is high, and every shot loses a piece before it lands. It is not hurry. It is the time it steals while you spend ammunition. Contact hurts a lot.',
        boss: 'On the last wave of each organ, the organism that opens the next room shows up. There are twenty, one for each crossing. The name, the road, and the trick are on each boss card.',
        plaque: 'Plaque is a stain that sits on the molar. Standing on it eats health bit by bit and makes your step heavy. It does not shoot. It waits. When saliva passes over it, the stain comes apart.',
        saliva: 'Saliva crosses the molar as a ribbon. Where it passes, plaque dissolves. If you are on the ribbon, it carries you and, for a moment, incoming damage arrives weaker. It is not a wall. It is a push with a film.',
        bite: 'First the band lights and the jaws close in. There is time to leave. The hit, and the sound, happen when the two walls meet. Whoever stayed in the middle is crushed. Whoever left the band is not.',
        enamel: 'Enamel is a pale drop on the molar. Picking it up puts on a film: for a few seconds, every hit that lands arrives at half strength. When the time is gone, the film is gone.',
        bile: 'Bile opens a puddle on the liver floor and stays there. It does not chase. Whoever remains inside burns, a little at a time. Step out and the damage stops. The floor is the danger.',
        filter: 'On the liver it reads sieve — pulls. It lights and pulls loose things to the center: you, bacteria, fungus, virus, DNA. Whoever gets squeezed in the middle takes damage. Leave before you are last.',
        heal: 'On the gold drop it reads sugar — heal. That is what the liver stores. Picking it up does not fill you at once. For a few seconds the body patches itself, slowly. When the time passes, it is spent.',
        beat: 'Each heartbeat shoves the current sideways and gives you a short burst of speed. It is not an attack. It is the room’s pulse. You move a little faster, and whatever is loose goes with it.',
        ecg: 'A heartbeat line crosses a band. It is not decoration. Touching the line hurts. It passes and leaves. The mistake is standing in its way.',
        clot: 'A clot is born still, grows, and only then breaks loose and rides the blood. While it is forming, you can leave. Once it is loose, whoever touches it takes the shove. It does not come back.',
        gust: 'The gust crosses the lung in a band. The strands show which way the air pushes. It does not take health by itself: it moves whoever is in the band. Fighting the direction means losing your place.',
        cough: 'The cough warns in a band, tightens, and bursts. Whoever stayed inside is swept and loses a large piece of health. An enemy in the band goes out with the blow. The time to leave is before the burst.',
        oxygen: 'The pale molecule in the lung speeds your shot. For a few seconds the shots come out closer together. It does not raise the damage of each one. It raises the cadence. When it ends, the gap returns.',
        synapse: 'A bolt joins two points and hurts whoever is on the line, you or an enemy. The white bolt does more: it flashes the whole screen white on the same hit. It is not only light. It is damage, and it passes fast.',
        focus: 'The violet drop raises the chance of a critical for a few seconds. An ordinary shot stays the same. What changes is how often it finds the weak spot. When the time ends, the extra aim leaves.',
        dash: 'The dash is a short jerk in the direction you are already going. In that blink, damage does not get in. The window is small. Then you wait before you can do it again.',
        surge: 'The pulse spends your energy and sends a wave. Whoever takes the shock locks up for a moment, sparks and all. Some get shoved and stay on screen. A few resist. Loose DNA comes back to you. A boss rides it out.',
    },
    ES: {
        vital: 'Pilotas el cuerpo claro. El núcleo encendido es la vida: mientras late, la partida sigue. Si la vida baja demasiado, el tiempo se detiene un instante. Ese respiro se acaba y el ritmo vuelve.',
        bacteria: 'La bacteria entra por la derecha y sigue casi en línea recta. No apunta, no se parte, no llama a otra. Sigue siendo una hasta que un tiro la termina. El peligro es el contacto: si te toca, la vida baja.',
        virus: 'El virus casi no camina. Se queda atrás y, cada pocos segundos, escupe una púa hacia ti. De cerca, la púa se curva un poco. Aguanta tiros y casi no retrocede.',
        fungi: 'El hongo es liviano y rápido, con poca vida. El contacto duele, y el camino no es recto: sube y baja en zigzag. Pégale pronto. Si llegó cerca, ya pasó.',
        parasite: 'El parásito cruza despacio y ocupa sitio. La vida es alta, y cada tiro pierde un trozo antes de entrar. No es prisa. Es el tiempo que roba mientras gastas munición. El contacto duele mucho.',
        boss: 'En la última onda de cada órgano aparece el organismo que abre la sala siguiente. Son veinte, uno por cada viaje. El nombre, el camino y el truco están en la ficha de cada jefe.',
        plaque: 'La placa es una mancha quieta en el molar. Pisarla come vida de a poco y pone pesado el paso. No dispara. Espera. Cuando la saliva pasa por encima, la mancha se deshace.',
        saliva: 'La saliva cruza el molar en cinta. Donde pasa, la placa se disuelve. Si estás en el hilo, te lleva y, por un instante, el daño que llega es más débil. No es una pared. Es un empujón con una película.',
        bite: 'Primero la franja se enciende y las mandíbulas se acercan. Hay tiempo de salir. El golpe, y el ruido, ocurren cuando las dos paredes se encuentran. Quien se quedó en el medio es aplastado. Quien salió de la franja, no.',
        enamel: 'El esmalte es una gota clara en el molar. Tomarla pone una película: por unos segundos, todo golpe que te acierta llega con la mitad de la fuerza. Se acabó el tiempo, se acabó la película.',
        bile: 'La bilis abre un charco en el suelo del hígado y se queda ahí. No persigue. Quien permanece dentro se quema, de a poco. Sales del charco y el daño para. El suelo es el peligro.',
        filter: 'El colador del hígado se enciende y jala lo suelto al centro: tú, bacteria, hongo, virus, ADN. Quien llega exprimido al medio recibe daño. Sal antes de ser el último.',
        heal: 'En la gota dorada dice azúcar — cura. Es lo que guarda el hígado. Tomarla no llena la vida de una vez. Por unos segundos el cuerpo se remienda, despacio. Pasó el tiempo y se acabó.',
        beat: 'En cada latido el corazón empuja la corriente de lado y te da un tirón corto de velocidad. No es un ataque. Es el compás de la sala. Andas un poco más rápido, y lo que está suelto va contigo.',
        ecg: 'Una línea de latido cruza una franja. No es adorno. Tocar la línea lastima. Pasa y se va. El error es quedarse en su camino.',
        clot: 'El coágulo nace quieto, crece, y solo entonces se suelta y baja con la sangre. Mientras se forma, se puede salir. Cuando se suelta, quien lo toca se lleva el tirón. No vuelve.',
        gust: 'La ráfaga cruza el pulmón en una franja. Los hilos muestran hacia dónde empuja el aire. No quita vida por sí sola: mueve a quien está en la franja. Pelear con la dirección es perder el sitio.',
        cough: 'La tos avisa en una franja, aprieta y estalla. Quien se quedó dentro es barrido y pierde un trozo grande de vida. El enemigo que estaba en la franja se va con el soplo. La hora de salir es antes del estallido.',
        oxygen: 'La molécula clara del pulmón acelera tu tiro. Por unos segundos los disparos salen más seguidos. No sube el daño de cada uno. Sube la cadencia. Cuando termina, el intervalo vuelve.',
        synapse: 'Un rayo une dos puntos y lastima a quien está en la línea, tú o un enemigo. El rayo blanco hace más: revienta la pantalla de blanco en el mismo golpe. No es solo luz. Es daño, y pasa rápido.',
        focus: 'La gota violeta sube la chance de crítico por unos segundos. El tiro común sigue igual. Lo que cambia es cuántas veces encuentra el punto débil. Se acabó el tiempo y la mira extra se va.',
        dash: 'El esquive es un tirón corto en la dirección en que ya vas. En ese parpadeo el daño no entra. La ventana es chica. Después hay que esperar para hacerlo otra vez.',
        surge: 'El pulso gasta la energía y suelta una onda. Quien recibe el choque se traba un instante, con chispas. Otra parte sale empujada y sigue en pantalla. Hay quien resiste. El ADN suelto vuelve a ti. El jefe aguanta el tirón.',
    },
};

const HOP: Record<Language, Record<string, string>> = {
    PT: {
        'molar>liver': 'A placa, a saliva e a mordida ficam no molar. No fígado o chão abre poça de bile, o filtro puxa para o centro, e uma gota dourada devolve vida por uns segundos. A corrida segue porque o que a boca solta desce, e a próxima sala é essa.',
        'molar>heart': 'Você deixa o dente e entra no compasso. Cada batida te empurra, a linha do eletro corta a faixa, e mais adiante o coágulo se solta com o sangue. A boca infectada manda coisa para o sangue, e o sangue passa primeiro aqui.',
        'molar>lung': 'Placa e mordida ficam para trás. No pulmão a lufada empurra, a tosse varre a faixa, e a molécula clara acelera o tiro. O que a boca deixa escapar pode descer pelo ar, e a sala seguinte é o pulmão.',
        'molar>brain': 'O molar acaba e o céu da tela muda. No cérebro o raio liga dois pontos, o branco estoura a tela, e a gota violeta faz o crítico sair mais. Tem caminho da boca para dentro do crânio, e a partida sobe por ele.',
        'liver>molar': 'Bile, filtro e cura ficam no fígado. De volta ao molar aparecem a placa que come a vida, a saliva que limpa e carrega, e a mordida que só faz barulho quando fecha. A bile sobe e reabre o dente, e a sala volta a ser essa.',
        'liver>heart': 'Você sai do filtro e entra na bomba. A batida acelera o passo, o eletro machuca quem fica na linha, e o coágulo desce depois de crescer. Fígado congesto segura sangue que o coração queria de volta, e a próxima sala cobra isso.',
        'liver>lung': 'A poça e o redemoinho ficam para trás. No pulmão o ar empurra numa faixa, a tosse estoura, e o oxigênio aperta a cadência. Fígado que falha manda líquido para onde devia ter ar, e você entra nessa sala.',
        'liver>brain': 'A cura dourada não vem junto. No cérebro o perigo é a linha do raio, o clarão branco, e a gota que sobe o crítico. Fígado que não limpa deixa sujeira seguir no sangue, e o pensamento é a sala seguinte.',
        'heart>molar': 'Batida, eletro e coágulo ficam no peito. No molar o chão gruda, a saliva atravessa, e as mandíbulas fecham na faixa. O que o sangue carrega volta a semear a boca, e a partida desce até o dente.',
        'heart>liver': 'Você deixa o compasso. No fígado a bile queima quem fica, o filtro puxa, e a gota dourada remenda por uns segundos. O fígado vive do sangue que o coração manda. Se a bomba falha, a próxima sala é essa.',
        'heart>lung': 'O coágulo não atravessa com você. No pulmão a lufada mostra a direção, a tosse varre quem ficou, e o oxigênio acelera o tiro. Quando o coração não dá conta, o sangue enche o lugar do ar, e a sala é o pulmão.',
        'heart>brain': 'A batida fica para trás. No cérebro um raio cruza, o branco estoura a tela, e o foco violeta faz o crítico acontecer mais. Um coágulo do coração tem caminho curto até lá, e a partida sobe com ele.',
        'lung>molar': 'Lufada, tosse e oxigênio ficam no peito. No molar a placa segura o passo, a saliva limpa e te leva, e a mordida esmaga quem não saiu. Tosse demais seca a boca, e a sala de cima volta a ser o dente.',
        'lung>liver': 'O ar não vem junto. No fígado a poça queima, o filtro junta tudo no centro, e a gota dourada devolve vida aos poucos. Pulmão ruim entrega sangue pobre, e quem filtra é a próxima sala.',
        'lung>heart': 'Você sai do sopro e entra no compasso. A batida te acelera, a linha do eletro corta, e o coágulo se solta e desce. Falta de ar força a bomba, e a sala seguinte é o coração.',
        'lung>brain': 'A tosse fica para trás. No cérebro o raio machuca na linha, o branco toma a tela, e a gota violeta empresta crítico. Ar que não troca sobe até o pensamento, e a partida entra nessa sala.',
        'brain>molar': 'Raio e foco ficam no crânio. No molar a placa come a vida, a saliva desfaz a mancha, e as mandíbulas só batem quando se encontram. O cérebro range o dente no escuro, e a sala de baixo é essa.',
        'brain>liver': 'O clarão branco não atravessa. No fígado a bile é chão, o filtro puxa, e a cura vem numa gota, não num instante. O fígado obedece ordem que vem de cima. Se a ordem falha, a próxima sala é essa.',
        'brain>heart': 'Você deixa a sinapse. No coração cada batida empurra, o eletro é uma linha que dói, e o coágulo cresce antes de descer. Quem manda a pressa do peito mora aqui em cima, e a sala seguinte obedece.',
        'brain>lung': 'O foco violeta fica para trás. No pulmão a lufada desloca, a tosse varre a faixa, e o oxigênio faz o tiro sair mais seguido. Quem manda o próximo ar mora no cérebro. Se o comando some, a sala é o pulmão.',
    },
    EN: {
        'molar>liver': 'Plaque, saliva, and the bite stay on the molar. In the liver the floor opens a bile puddle, the filter pulls to the center, and a gold drop gives health back for a few seconds. The run goes on because what the mouth lets slip goes down, and the next room is this one.',
        'molar>heart': 'You leave the tooth and enter the pulse. Each beat shoves you, the ECG line cuts the band, and later the clot breaks loose with the blood. An infected mouth sends things into the blood, and the blood crosses here first.',
        'molar>lung': 'Plaque and the bite stay behind. In the lung the gust pushes, the cough sweeps the band, and the pale molecule speeds your shot. What the mouth lets slip can go down with the air, and the next room is the lung.',
        'molar>brain': 'The molar ends and the sky of the screen changes. In the brain a bolt joins two points, the white one flashes the screen, and the violet drop makes criticals land more often. There is a road from the mouth into the skull, and the run climbs it.',
        'liver>molar': 'Bile, the filter, and the heal stay in the liver. Back on the molar you get plaque that eats health, saliva that cleans and carries, and a bite that only sounds when it shuts. Bile climbs and reopens the tooth, and the room is this one again.',
        'liver>heart': 'You leave the filter and enter the pump. The beat speeds your step, the ECG hurts whoever stays on the line, and the clot rides down after it grows. A congested liver holds blood the heart wanted back, and the next room collects.',
        'liver>lung': 'The puddle and the whirlpool stay behind. In the lung the air pushes in a band, the cough bursts, and oxygen tightens the cadence. A failing liver sends fluid where air should be, and you walk into that room.',
        'liver>brain': 'The gold heal does not come with you. In the brain the danger is the bolt’s line, the white flash, and the drop that raises criticals. A liver that does not clean lets dirt stay in the blood, and thought is the next room.',
        'heart>molar': 'Beat, ECG, and clot stay in the chest. On the molar the floor sticks, saliva crosses, and the jaws close on the band. What the blood carries comes back to seed the mouth, and the run goes down to the tooth.',
        'heart>liver': 'You leave the pulse. In the liver bile burns whoever stays, the filter pulls, and the gold drop patches you for a few seconds. The liver lives on the blood the heart sends. If the pump fails, the next room is this one.',
        'heart>lung': 'The clot does not cross with you. In the lung the gust shows the direction, the cough sweeps whoever stayed, and oxygen speeds the shot. When the heart cannot keep up, blood fills the place of air, and the room is the lung.',
        'heart>brain': 'The beat stays behind. In the brain a bolt crosses, the white one flashes the screen, and violet focus makes criticals happen more. A clot from the heart has a short road up there, and the run climbs with it.',
        'lung>molar': 'Gust, cough, and oxygen stay in the chest. On the molar plaque slows your step, saliva cleans and carries you, and the bite crushes whoever did not leave. Too much coughing dries the mouth, and the room upstairs is the tooth again.',
        'lung>liver': 'The air does not come with you. In the liver the puddle burns, the filter gathers everything at the center, and the gold drop gives health back slowly. A bad lung delivers poor blood, and whoever filters is the next room.',
        'lung>heart': 'You leave the blow and enter the pulse. The beat speeds you, the ECG line cuts, and the clot breaks loose and rides down. Shortness of air forces the pump, and the next room is the heart.',
        'lung>brain': 'The cough stays behind. In the brain the bolt hurts on the line, the white takes the screen, and the violet drop lends you criticals. Air that does not trade climbs into thought, and the run enters that room.',
        'brain>molar': 'Bolt and focus stay in the skull. On the molar plaque eats health, saliva undoes the stain, and the jaws only strike when they meet. The brain grinds the tooth in the dark, and the room below is this one.',
        'brain>liver': 'The white flash does not cross. In the liver bile is the floor, the filter pulls, and the heal comes as a drop, not all at once. The liver takes orders from above. If the order fails, the next room is this one.',
        'brain>heart': 'You leave the synapse. In the heart each beat shoves, the ECG is a line that hurts, and the clot grows before it rides down. Whoever sets the hurry of the chest lives up here, and the next room obeys.',
        'brain>lung': 'The violet focus stays behind. In the lung the gust moves you, the cough sweeps the band, and oxygen makes the shots come closer together. Whoever asks for the next breath lives in the brain. If the order vanishes, the room is the lung.',
    },
    ES: {
        'molar>liver': 'La placa, la saliva y la mordida se quedan en el molar. En el hígado el suelo abre un charco de bilis, el filtro jala al centro, y una gota dorada devuelve vida por unos segundos. La partida sigue porque lo que la boca suelta baja, y la sala siguiente es esta.',
        'molar>heart': 'Dejas el diente y entras en el compás. Cada latido te empuja, la línea del electro corta la franja, y más adelante el coágulo se suelta con la sangre. La boca infectada manda cosas a la sangre, y la sangre pasa primero por aquí.',
        'molar>lung': 'Placa y mordida se quedan atrás. En el pulmón la ráfaga empuja, la tos barre la franja, y la molécula clara acelera el tiro. Lo que la boca deja escapar puede bajar con el aire, y la sala siguiente es el pulmón.',
        'molar>brain': 'El molar termina y el cielo de la pantalla cambia. En el cerebro el rayo une dos puntos, el blanco revienta la pantalla, y la gota violeta hace que el crítico salga más. Hay camino de la boca al cráneo, y la partida sube por él.',
        'liver>molar': 'Bilis, filtro y cura se quedan en el hígado. De vuelta en el molar aparecen la placa que come vida, la saliva que limpia y lleva, y la mordida que solo suena cuando cierra. La bilis sube y reabre el diente, y la sala vuelve a ser esta.',
        'liver>heart': 'Sales del filtro y entras en la bomba. El latido acelera el paso, el electro lastima a quien se queda en la línea, y el coágulo baja después de crecer. Un hígado congestionado retiene sangre que el corazón quería de vuelta, y la sala siguiente cobra eso.',
        'liver>lung': 'El charco y el remolino se quedan atrás. En el pulmón el aire empuja en una franja, la tos estalla, y el oxígeno aprieta la cadencia. Un hígado que falla manda líquido adonde debía haber aire, y entras en esa sala.',
        'liver>brain': 'La cura dorada no viene contigo. En el cerebro el peligro es la línea del rayo, el fogonazo blanco, y la gota que sube el crítico. Un hígado que no limpia deja suciedad en la sangre, y el pensamiento es la sala siguiente.',
        'heart>molar': 'Latido, electro y coágulo se quedan en el pecho. En el molar el suelo se pega, la saliva cruza, y las mandíbulas cierran en la franja. Lo que la sangre carga vuelve a sembrar la boca, y la partida baja hasta el diente.',
        'heart>liver': 'Dejas el compás. En el hígado la bilis quema a quien se queda, el filtro jala, y la gota dorada remienda por unos segundos. El hígado vive de la sangre que manda el corazón. Si la bomba falla, la sala siguiente es esta.',
        'heart>lung': 'El coágulo no cruza contigo. En el pulmón la ráfaga muestra la dirección, la tos barre a quien se quedó, y el oxígeno acelera el tiro. Cuando el corazón no da abasto, la sangre llena el lugar del aire, y la sala es el pulmón.',
        'heart>brain': 'El latido se queda atrás. En el cerebro un rayo cruza, el blanco revienta la pantalla, y el foco violeta hace que el crítico pase más. Un coágulo del corazón tiene un camino corto hasta ahí, y la partida sube con él.',
        'lung>molar': 'Ráfaga, tos y oxígeno se quedan en el pecho. En el molar la placa frena el paso, la saliva limpia y te lleva, y la mordida aplasta a quien no salió. Toser de más seca la boca, y la sala de arriba vuelve a ser el diente.',
        'lung>liver': 'El aire no viene contigo. En el hígado el charco quema, el filtro junta todo en el centro, y la gota dorada devuelve vida de a poco. Un pulmón malo entrega sangre pobre, y quien filtra es la sala siguiente.',
        'lung>heart': 'Sales del soplo y entras en el compás. El latido te acelera, la línea del electro corta, y el coágulo se suelta y baja. La falta de aire fuerza la bomba, y la sala siguiente es el corazón.',
        'lung>brain': 'La tos se queda atrás. En el cerebro el rayo lastima en la línea, el blanco toma la pantalla, y la gota violeta presta crítico. El aire que no se cambia sube hasta el pensamiento, y la partida entra en esa sala.',
        'brain>molar': 'Rayo y foco se quedan en el cráneo. En el molar la placa come vida, la saliva deshace la mancha, y las mandíbulas solo golpean cuando se encuentran. El cerebro rechina el diente en la oscuridad, y la sala de abajo es esta.',
        'brain>liver': 'El fogonazo blanco no cruza. En el hígado la bilis es el suelo, el filtro jala, y la cura llega en una gota, no de una vez. El hígado obedece una orden que viene de arriba. Si la orden falla, la sala siguiente es esta.',
        'brain>heart': 'Dejas la sinapsis. En el corazón cada latido empuja, el electro es una línea que duele, y el coágulo crece antes de bajar. Quien manda la prisa del pecho vive aquí arriba, y la sala siguiente obedece.',
        'brain>lung': 'El foco violeta se queda atrás. En el pulmón la ráfaga desplaza, la tos barre la franja, y el oxígeno hace que el tiro salga más seguido. Quien pide el siguiente aire vive en el cerebro. Si la orden desaparece, la sala es el pulmón.',
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
    if (lang === 'PT') return 'CADA CHEFE, UMA VIAGEM';
    if (lang === 'ES') return 'CADA JEFE, UN VIAJE';
    return 'EACH BOSS IS A CROSSING';
}

export function tapHint(lang: Language): string {
    if (lang === 'PT') return 'Toca uma ficha.';
    if (lang === 'ES') return 'Toca una ficha.';
    return 'Tap a card.';
}

export function sheetKicker(lang: Language): string {
    if (lang === 'PT') return 'NA PARTIDA';
    if (lang === 'ES') return 'EN LA PARTIDA';
    return 'IN THE RUN';
}

export function closeLabel(lang: Language): string {
    if (lang === 'PT') return 'FECHAR';
    if (lang === 'ES') return 'CERRAR';
    return 'CLOSE';
}
