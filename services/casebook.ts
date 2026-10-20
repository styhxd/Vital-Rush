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

const CLOSE: Record<Language, string> = {
    PT: 'O Vital entra pelo primeiro foco. Cada órgão seguinte fecha mais, e o último não dá trégua.',
    EN: 'Vital goes in through the first focus. Each next organ shuts tighter, and the last one gives no quarter.',
    ES: 'Vital entra por el primer foco. Cada órgano siguiente cierra más, y el último no da tregua.',
};

const HOP: Record<Language, Record<string, string>> = {
    PT: {
        'molar>liver': 'As bactérias da gengiva descem pela veia porta e infectam o fígado',
        'molar>heart': 'O foco oral semeia o endocárdio e chega ao coração',
        'molar>lung': 'A secreção da boca é aspirada e cai no pulmão',
        'molar>brain': 'O abscesso sobe pela veia facial até o cérebro',
        'liver>molar': 'A bile regurgita, necrosa a gengiva e reabre o molar',
        'liver>heart': 'A congestão hepática sobrecarrega o átrio e toma o coração',
        'liver>lung': 'A falência do fígado empurra fluido e afoga o pulmão',
        'liver>brain': 'A amônia atravessa a barreira e turva o cérebro',
        'heart>molar': 'A bacteremia volta e floreia o molar',
        'heart>liver': 'O débito cai e isquemia o fígado',
        'heart>lung': 'O ventrículo falha e o sangue alaga o pulmão',
        'heart>brain': 'Um êmbolo sobe pela carótida e fecha o cérebro',
        'lung>molar': 'A tosse crônica seca a mucosa e abre o molar',
        'lung>liver': 'A hipoxemia maltrata o fígado',
        'lung>heart': 'A hipóxia força o ventrículo e estoura no coração',
        'lung>brain': 'O gás carbônico sobe e apaga o cérebro',
        'brain>molar': 'O bruxismo racha o esmalte e infecta o molar',
        'brain>liver': 'O eixo neural derruba o metabolismo do fígado',
        'brain>heart': 'A tempestade autonômica dispara o coração',
        'brain>lung': 'O tronco perde o comando e o pulmão para',
    },
    EN: {
        'molar>liver': 'Gum bacteria drop through the portal vein and infect the liver',
        'molar>heart': 'The oral focus seeds the endocardium and reaches the heart',
        'molar>lung': 'Mouth secretions are aspirated and fall into the lung',
        'molar>brain': 'The abscess climbs the facial vein into the brain',
        'liver>molar': 'Bile refluxes, necroses the gum, and reopens the molar',
        'liver>heart': 'Hepatic congestion overloads the atrium and takes the heart',
        'liver>lung': 'Liver failure pushes fluid and drowns the lung',
        'liver>brain': 'Ammonia crosses the barrier and clouds the brain',
        'heart>molar': 'Bacteremia returns and blooms in the molar',
        'heart>liver': 'Output falls and the liver goes ischemic',
        'heart>lung': 'The ventricle fails and blood floods the lung',
        'heart>brain': 'An embolus climbs the carotid and shuts the brain',
        'lung>molar': 'Chronic cough dries the mucosa and opens the molar',
        'lung>liver': 'Hypoxemia batters the liver',
        'lung>heart': 'Hypoxia strains the ventricle and bursts into the heart',
        'lung>brain': 'Carbon dioxide rises and blacks out the brain',
        'brain>molar': 'Bruxism cracks the enamel and infects the molar',
        'brain>liver': 'The neural axis drops the liver’s metabolism',
        'brain>heart': 'An autonomic storm fires the heart',
        'brain>lung': 'The brainstem loses command and the lung stops',
    },
    ES: {
        'molar>liver': 'Las bacterias de la encía bajan por la vena porta e infectan el hígado',
        'molar>heart': 'El foco oral siembra el endocardio y llega al corazón',
        'molar>lung': 'La secreción de la boca se aspira y cae al pulmón',
        'molar>brain': 'El absceso sube por la vena facial hasta el cerebro',
        'liver>molar': 'La bilis regurgita, necrosa la encía y reabre el molar',
        'liver>heart': 'La congestión hepática carga la aurícula y toma el corazón',
        'liver>lung': 'La falla del hígado empuja líquido y ahoga el pulmón',
        'liver>brain': 'El amoníaco cruza la barrera y nubla el cerebro',
        'heart>molar': 'La bacteremia vuelve y florece en el molar',
        'heart>liver': 'El gasto cae y el hígado se isquemia',
        'heart>lung': 'El ventrículo falla y la sangre inunda el pulmón',
        'heart>brain': 'Un émbolo sube por la carótida y cierra el cerebro',
        'lung>molar': 'La tos crónica seca la mucosa y abre el molar',
        'lung>liver': 'La hipoxemia maltrata el hígado',
        'lung>heart': 'La hipoxia fuerza el ventrículo y estalla en el corazón',
        'lung>brain': 'El dióxido de carbono sube y apaga el cerebro',
        'brain>molar': 'El bruxismo raja el esmalte e infecta el molar',
        'brain>liver': 'El eje neural tumba el metabolismo del hígado',
        'brain>heart': 'La tormenta autonómica dispara el corazón',
        'brain>lung': 'El tronco pierde el mando y el pulmón se detiene',
    },
};

function pathOf(route: OrganId[] | undefined): OrganId[] {
    if (route && route.length === 5 && new Set(route).size === 5) return route;
    return CANON_ROUTE;
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
