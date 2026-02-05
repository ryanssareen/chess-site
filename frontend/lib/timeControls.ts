import { TimeControl } from '@/types';

export const TIME_CONTROLS: TimeControl[] = [
  { label: 'Bullet • 1+0', initial: 60, increment: 0, code: '1+0' },
  { label: 'Bullet • 2+1', initial: 120, increment: 1, code: '2+1' },
  { label: 'Blitz • 3+2', initial: 180, increment: 2, code: '3+2' },
  { label: 'Blitz • 5+0', initial: 300, increment: 0, code: '5+0' },
  { label: 'Rapid • 10+5', initial: 600, increment: 5, code: '10+5' },
  { label: 'Classical • 15+10', initial: 900, increment: 10, code: '15+10' }
];
