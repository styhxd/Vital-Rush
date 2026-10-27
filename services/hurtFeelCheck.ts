import { checkHurtFeel } from './hurtFeel';

const fail = checkHurtFeel();
if (fail.length) {
    for (const line of fail) console.error(line);
    throw new Error('hurt feel check failed');
}
console.log('hurt feel check passed');
