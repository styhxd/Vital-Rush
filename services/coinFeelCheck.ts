import { checkCoinFeel } from './coinFeel';

const report = checkCoinFeel();
for (const line of report.lines) console.log(line);
if (!report.ok) {
    for (const failure of report.failures) console.error('FALHOU: ' + failure);
    throw new Error('coleta de moeda fora do estudo');
}
console.log('ok');
