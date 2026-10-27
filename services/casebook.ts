/**
 * As 120 versões do arcade: cada permutação dos cinco órgãos
 * é uma doença, e a frase diz por que o Vital entra nessa ordem.
 */

import { Language, OrganId } from '../types';

export const CANON_ROUTE: OrganId[] = ['molar', 'liver', 'heart', 'lung', 'brain'];

const ORGANS: OrganId[] = ['molar', 'liver', 'heart', 'lung', 'brain'];

export function randomRoute(): OrganId[] {
    const route = [...ORGANS];
    for (let i = route.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = route[i];
        route[i] = route[j];
        route[j] = swap;
    }
    return route;
}

const NAME: Record<Language, Record<OrganId, string>> = {
    PT: { molar: 'molar', liver: 'fígado', heart: 'coração', lung: 'pulmão', brain: 'cérebro' },
    EN: { molar: 'molar', liver: 'liver', heart: 'heart', lung: 'lung', brain: 'brain' },
    ES: { molar: 'molar', liver: 'hígado', heart: 'corazón', lung: 'pulmón', brain: 'cerebro' },
};

const OPEN: Record<Language, Record<OrganId, string>> = {
    PT: {
        molar: 'Abscesso latejando na polpa do molar',
        liver: 'Hepatite que entope o lóbulo do fígado',
        heart: 'Endocardite agarrada na válvula e no átrio',
        lung: 'Pneumonia que alaga o fundo do alvéolo',
        brain: 'Meningite queimando sobre o córtex',
    },
    EN: {
        molar: 'An abscess throbbing in the molar pulp',
        liver: 'Hepatitis clogging the liver lobule',
        heart: 'Endocarditis clinging to the atrium',
        lung: 'Pneumonia flooding the deep alveoli',
        brain: 'Meningitis burning across the cortex',
    },
    ES: {
        molar: 'Absceso latiendo en la pulpa del molar',
        liver: 'Hepatitis que tapa el lóbulo hepático',
        heart: 'Endocarditis pegada en la aurícula',
        lung: 'Neumonía que inunda el fondo del alvéolo',
        brain: 'Meningitis ardiendo sobre la corteza',
    },
};

const HOP: Record<Language, Record<string, string>> = {
    PT: {
        'molar>liver': 'A bactéria da gengiva pega a veia porta. Quando para no fígado, vira pus.',
        'molar>heart': 'O sangue que sai da boca bate na válvula e gruda. O coração vira casa.',
        'molar>lung': 'O que escorre da boca desce junto com o ar e estaciona no pulmão.',
        'molar>brain': 'O pus do molar sobe pela veia da face. O andar de cima é o cérebro.',
        'liver>molar': 'A bile amarga sobe, queima a gengiva e o molar abre de novo.',
        'liver>heart': 'O fígado pesado represa sangue demais. Lá em cima, o átrio cansa.',
        'liver>lung': 'O fígado que falha solta líquido demais. O pulmão alaga onde devia ter ar.',
        'liver>brain': 'A amônia que o fígado não limpou passa direto. Lá em cima, a mente turva.',
        'heart>molar': 'A bactéria que rodava no sangue faz o caminho de volta. O bolso do dente é casa velha.',
        'heart>liver': 'O coração perde força na bomba. O fígado fica sem o sangue que pedia.',
        'heart>lung': 'O ventrículo falha na batida. O sangue represado alaga onde devia ter ar.',
        'heart>brain': 'Um pedaço solto sobe pela carótida e fecha uma rua do cérebro.',
        'lung>molar': 'Tosse sem trégua resseca a boca. O esmalte racha e o molar infecta.',
        'lung>liver': 'O sangue sai do pulmão com pouco oxigênio. O fígado é o primeiro a sentir.',
        'lung>heart': 'Falta ar no pulmão e o ventrículo força a barra. O coração estoura por dentro.',
        'lung>brain': 'O gás carbônico acumula e sobe. Lá em cima, o cérebro apaga.',
        'brain>molar': 'O cérebro tenso faz ranger o dente. O esmalte racha e o molar infecta.',
        'brain>liver': 'O comando lá de cima falha. Sem sinal, o fígado desacelera.',
        'brain>heart': 'Um disparo seco de nervo desce do cérebro. O coração acelera sem ninguém pedir.',
        'brain>lung': 'O tronco cerebral larga o comando. Lá embaixo, o pulmão esquece de pedir ar.',
    },
    EN: {
        'molar>liver': 'Gum bacteria catch a ride down the portal vein. When they stop in the liver, they turn to pus.',
        'molar>heart': 'Blood from the mouth hits the valve and holds tight. The heart becomes home.',
        'molar>lung': 'What drips from the mouth rides the breath down and parks in the lung.',
        'molar>brain': 'Pus from the molar climbs the facial vein. The brain is right upstairs.',
        'liver>molar': 'Bitter bile creeps up, burns the gum, and lays the molar open again.',
        'liver>heart': 'A heavy liver dams up too much blood. Upstream, the atrium wears out.',
        'liver>lung': 'A failing liver lets fluid loose. The lung floods right where air belongs.',
        'liver>brain': 'Ammonia the liver failed to clear slips right through. Upstairs, the mind clouds over.',
        'heart>molar': 'Bacteria riding the blood make the return trip. The tooth pocket is an old home.',
        'heart>liver': 'The heart loses its pumping drive. The liver starves for the blood it asked for.',
        'heart>lung': 'The ventricle falters on the beat. Backed-up blood floods the space meant for air.',
        'heart>brain': 'A loose fragment climbs the carotid and blocks off a street in the brain.',
        'lung>molar': 'Nonstop coughing dries out the mouth. Enamel cracks and the molar gets infected.',
        'lung>liver': 'Blood leaves the lung short on oxygen. The liver is the first to feel the pinch.',
        'lung>heart': 'Air runs short and the ventricle strains against the load. The heart gives way inside.',
        'lung>brain': 'Carbon dioxide builds up and climbs. Upstairs, the brain blacks out.',
        'brain>molar': 'A tense brain grinds the teeth down. Enamel cracks and the molar gets infected.',
        'brain>liver': 'The command from upstairs falters. Without the signal, the liver slows down.',
        'brain>heart': 'A sudden nerve jolt fires down from the brain. The heart races with nobody asking.',
        'brain>lung': 'The brainstem drops the controls. Down below, the lung forgets to ask for air.',
    },
    ES: {
        'molar>liver': 'La bacteria de la encía baja por la vena porta. Cuando frena en el hígado, se vuelve pus.',
        'molar>heart': 'La sangre que sale de la boca se pega a la válvula. El corazón se vuelve casa.',
        'molar>lung': 'Lo que escurre de la boca baja con el aire y se instala en el pulmón.',
        'molar>brain': 'El pus del molar sube por la vena de la cara. El piso de arriba es el cerebro.',
        'liver>molar': 'La bilis amarga sube, quema la encía y el molar se abre otra vez.',
        'liver>heart': 'El hígado cargado retiene sangre de más. Arriba, la aurícula se cansa.',
        'liver>lung': 'El hígado que falla suelta líquido de más. El pulmón se inunda donde iba el aire.',
        'liver>brain': 'El amoníaco que el hígado no limpió pasa de largo. Arriba, la cabeza se nubla.',
        'heart>molar': 'La bacteria que giraba en la sangre pega la vuelta. El bolsillo del diente es casa vieja.',
        'heart>liver': 'El corazón bombea con poca fuerza. El hígado se queda sin la sangre que pedía.',
        'heart>lung': 'El ventrículo falla en el latido. La sangre acumulada inunda donde había aire.',
        'heart>brain': 'Un pedazo suelto sube por la carótida y cierra un tramo del cerebro.',
        'lung>molar': 'Toser sin pausa reseca la boca. El esmalte se raja y el molar se infecta.',
        'lung>liver': 'La sangre sale del pulmón con poco oxígeno. El hígado es el primero en sentirlo.',
        'lung>heart': 'Falta el aire y el ventrículo hace fuerza de más. El corazón revienta por dentro.',
        'lung>brain': 'El dióxido de carbono se acumula y sube. Arriba, el cerebro se apaga.',
        'brain>molar': 'El cerebro tenso hace rechinar el diente. El esmalte se raja y el molar se infecta.',
        'brain>liver': 'La orden de arriba falla. Sin señal, el hígado baja el ritmo.',
        'brain>heart': 'Una descarga de nervio baja desde el cerebro. El corazón se dispara sin que nadie pida.',
        'brain>lung': 'El tronco cerebral suelta el mando. Abajo, el pulmón se olvida de pedir aire.',
    },
};

function pathOf(route: OrganId[] | undefined): OrganId[] {
    if (route && route.length === 5 && new Set(route).size === 5) return route;
    return CANON_ROUTE;
}

export function isCanonRoute(route: OrganId[] | undefined): boolean {
    if (!route || route.length !== CANON_ROUTE.length) return false;
    return CANON_ROUTE.every((organ, index) => route[index] === organ);
}

export function hopLine(from: OrganId, to: OrganId, lang: Language): string {
    return HOP[lang][`${from}>${to}`] || HOP.EN[`${from}>${to}`] || '';
}

export function symptomText(route: OrganId[] | undefined, lang: Language): string {
    return OPEN[lang][pathOf(route)[0]];
}

export function organPlainName(id: OrganId, lang: Language): string {
    return NAME[lang][id];
}
