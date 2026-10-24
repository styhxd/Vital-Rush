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
        molar: 'Abscesso na polpa do molar',
        liver: 'Hepatite que entope o lóbulo',
        heart: 'Endocardite no átrio',
        lung: 'Pneumonia que alaga o alvéolo',
        brain: 'Meningite no córtex',
    },
    EN: {
        molar: 'An abscess in the molar pulp',
        liver: 'Hepatitis clogging the lobule',
        heart: 'Endocarditis in the atrium',
        lung: 'Pneumonia flooding the alveoli',
        brain: 'Meningitis in the cortex',
    },
    ES: {
        molar: 'Absceso en la pulpa del molar',
        liver: 'Hepatitis que tapa el lóbulo',
        heart: 'Endocarditis en la aurícula',
        lung: 'Neumonía que inunda el alvéolo',
        brain: 'Meningitis en la corteza',
    },
};

const HOP: Record<Language, Record<string, string>> = {
    PT: {
        'molar>liver': 'Bactéria da gengiva desce a veia porta. No fígado, vira pus.',
        'molar>heart': 'Sangue da boca gruda na válvula. O coração vira casa.',
        'molar>lung': 'O que escorre da boca desce com o ar e para no pulmão.',
        'molar>brain': 'O pus do molar sobe a veia da face. O cérebro é em cima.',
        'liver>molar': 'A bile sobe, queima a gengiva, e o molar abre de novo.',
        'liver>heart': 'Fígado cheio segura sangue demais. O átrio cansa.',
        'liver>lung': 'Fígado que falha manda líquido. O pulmão enche no lugar do ar.',
        'liver>brain': 'Amônia que o fígado não limpou atravessa. A cabeça turva.',
        'heart>molar': 'A bactéria do sangue volta. O bolso do dente é casa velha.',
        'heart>liver': 'O coração bombeia pouco. O fígado fica sem o sangue que pedia.',
        'heart>lung': 'O ventrículo falha. O sangue alaga onde tinha ar.',
        'heart>brain': 'Um pedaço sobe a carótida e fecha um trecho do cérebro.',
        'lung>molar': 'Tosse demais seca a boca. O esmalte racha e o molar infecta.',
        'lung>liver': 'Sangue com pouco oxigênio. O fígado sente primeiro.',
        'lung>heart': 'Falta ar, o ventrículo força, e o coração estoura por dentro.',
        'lung>brain': 'Gás carbônico sobe. O cérebro apaga.',
        'brain>molar': 'O cérebro range o dente. O esmalte racha e o molar infecta.',
        'brain>liver': 'A ordem de cima falha. O fígado desacelera.',
        'brain>heart': 'Um susto de nervo. O coração dispara sem ninguém pedir.',
        'brain>lung': 'O tronco solta o comando. O pulmão para de pedir ar.',
    },
    EN: {
        'molar>liver': 'Gum bacteria take the portal vein. In the liver, that is pus.',
        'molar>heart': 'Blood from the mouth sticks to the valve. The heart becomes home.',
        'molar>lung': 'What leaks from the mouth rides the air and stops in the lung.',
        'molar>brain': 'Pus from the molar climbs the facial vein. The brain is upstairs.',
        'liver>molar': 'Bile climbs, burns the gum, and the molar opens again.',
        'liver>heart': 'A full liver holds too much blood. The atrium gets tired.',
        'liver>lung': 'A liver that fails sends fluid. The lung fills where air should be.',
        'liver>brain': 'Ammonia the liver did not clear gets through. The head goes dull.',
        'heart>molar': 'Bacteria in the blood come back. The tooth pocket is an old home.',
        'heart>liver': 'The heart pumps little. The liver goes without the blood it asked for.',
        'heart>lung': 'The ventricle fails. Blood floods the place that had air.',
        'heart>brain': 'A piece climbs the carotid and shuts a stretch of brain.',
        'lung>molar': 'Too much coughing dries the mouth. Enamel cracks and the molar infects.',
        'lung>liver': 'Blood with too little oxygen. The liver feels it first.',
        'lung>heart': 'Air runs short, the ventricle strains, and the heart bursts inside.',
        'lung>brain': 'Carbon dioxide climbs. The brain goes out.',
        'brain>molar': 'The brain grinds the tooth. Enamel cracks and the molar infects.',
        'brain>liver': 'The order from above fails. The liver slows down.',
        'brain>heart': 'A nerve fright. The heart takes off with nobody asking.',
        'brain>lung': 'The brainstem lets go. The lung stops asking for air.',
    },
    ES: {
        'molar>liver': 'Bacteria de la encía baja por la vena porta. En el hígado, es pus.',
        'molar>heart': 'Sangre de la boca se pega a la válvula. El corazón se vuelve casa.',
        'molar>lung': 'Lo que escurre de la boca baja con el aire y para en el pulmón.',
        'molar>brain': 'El pus del molar sube la vena de la cara. El cerebro queda arriba.',
        'liver>molar': 'La bilis sube, quema la encía, y el molar se abre otra vez.',
        'liver>heart': 'Hígado lleno guarda sangre de más. La aurícula se cansa.',
        'liver>lung': 'Hígado que falla manda líquido. El pulmón se llena donde iba el aire.',
        'liver>brain': 'Amoníaco que el hígado no limpió se cruza. La cabeza se nubla.',
        'heart>molar': 'La bacteria de la sangre vuelve. El bolsillo del diente es casa vieja.',
        'heart>liver': 'El corazón bombea poco. El hígado se queda sin la sangre que pedía.',
        'heart>lung': 'El ventrículo falla. La sangre inunda donde había aire.',
        'heart>brain': 'Un pedazo sube la carótida y cierra un tramo del cerebro.',
        'lung>molar': 'Toser de más seca la boca. El esmalte se raja y el molar se infecta.',
        'lung>liver': 'Sangre con poco oxígeno. El hígado lo siente primero.',
        'lung>heart': 'Falta aire, el ventrículo fuerza, y el corazón estalla por dentro.',
        'lung>brain': 'El dióxido de carbono sube. El cerebro se apaga.',
        'brain>molar': 'El cerebro rechina el diente. El esmalte se raja y el molar se infecta.',
        'brain>liver': 'La orden de arriba falla. El hígado se frena.',
        'brain>heart': 'Un susto de nervio. El corazón se dispara sin que nadie pida.',
        'brain>lung': 'El tronco suelta el mando. El pulmón deja de pedir aire.',
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
